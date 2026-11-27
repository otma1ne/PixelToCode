import type * as TS from "typescript";

export class MissingResourceError extends Error {
  constructor(
    readonly file: string,
    readonly resource: string,
  ) {
    super(`${file}: cannot find ${resource}`);
  }
}

export interface TransformContext {
  /** Directory of the file being compiled, without trailing slash ("" for the root). */
  dir: string;
  file: string;
  readResource: (path: string) => string | undefined;
}

export function joinPath(dir: string, relative: string): string {
  const parts = dir ? dir.split("/") : [];
  for (const segment of relative.split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") parts.pop();
    else parts.push(segment);
  }
  return parts.join("/");
}

function isComponentDecorator(ts: typeof TS, node: TS.Node): node is TS.CallExpression {
  return (
    ts.isCallExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === "Component" &&
    node.parent !== undefined &&
    ts.isDecorator(node.parent)
  );
}

/**
 * Inlines templateUrl, styleUrl and styleUrls of @Component decorators,
 * because the JIT compiler in the sandbox cannot fetch files.
 */
export function inlineResources(
  ts: typeof TS,
  ctx: TransformContext,
): TS.TransformerFactory<TS.SourceFile> {
  const read = (path: string): string => {
    const full = joinPath(ctx.dir, path);
    const content = ctx.readResource(full);
    if (content === undefined) throw new MissingResourceError(ctx.file, path);
    return content;
  };

  return (context) => {
    const f = context.factory;
    const visit = (node: TS.Node): TS.Node => {
      if (isComponentDecorator(ts, node)) {
        const [arg] = node.arguments;
        if (arg && ts.isObjectLiteralExpression(arg)) {
          const props = arg.properties.flatMap((p): TS.ObjectLiteralElementLike[] => {
            if (!ts.isPropertyAssignment(p) || !ts.isIdentifier(p.name)) return [p];
            const key = p.name.text;
            const init = p.initializer;
            if (key === "templateUrl" && ts.isStringLiteralLike(init)) {
              return [
                f.createPropertyAssignment("template", f.createStringLiteral(read(init.text))),
              ];
            }
            if (key === "styleUrl" && ts.isStringLiteralLike(init)) {
              return [
                f.createPropertyAssignment(
                  "styles",
                  f.createArrayLiteralExpression([f.createStringLiteral(read(init.text))]),
                ),
              ];
            }
            if (key === "styleUrls" && ts.isArrayLiteralExpression(init)) {
              const styles = init.elements
                .filter(ts.isStringLiteralLike)
                .map((e) => f.createStringLiteral(read(e.text)));
              return [f.createPropertyAssignment("styles", f.createArrayLiteralExpression(styles))];
            }
            return [p];
          });
          return f.updateCallExpression(node, node.expression, node.typeArguments, [
            f.updateObjectLiteralExpression(arg, props),
          ]);
        }
      }
      return ts.visitEachChild(node, visit, context);
    };
    return (sf) => ts.visitNode(sf, visit) as TS.SourceFile;
  };
}

type SignalKind = "input" | "model" | "output";

function signalKind(
  ts: typeof TS,
  init: TS.Expression | undefined,
): { kind: SignalKind; required: boolean; call: TS.CallExpression } | null {
  if (!init || !ts.isCallExpression(init)) return null;
  const callee = init.expression;
  if (ts.isIdentifier(callee)) {
    if (callee.text === "input") return { kind: "input", required: false, call: init };
    if (callee.text === "model") return { kind: "model", required: false, call: init };
    if (callee.text === "output" || callee.text === "outputFromObservable") {
      return { kind: "output", required: false, call: init };
    }
  }
  if (
    ts.isPropertyAccessExpression(callee) &&
    ts.isIdentifier(callee.expression) &&
    callee.name.text === "required"
  ) {
    if (callee.expression.text === "input") return { kind: "input", required: true, call: init };
    if (callee.expression.text === "model") return { kind: "model", required: true, call: init };
  }
  return null;
}

/**
 * Reads `alias` from the options object of input(), model() or output().
 * input(initial, opts), input.required(opts), model(initial, opts), output(opts).
 */
function aliasOf(
  ts: typeof TS,
  kind: SignalKind,
  required: boolean,
  call: TS.CallExpression,
): string | undefined {
  const optsIndex = kind === "output" || required ? 0 : 1;
  const opts = call.arguments[optsIndex];
  if (!opts || !ts.isObjectLiteralExpression(opts)) return undefined;
  for (const p of opts.properties) {
    if (
      ts.isPropertyAssignment(p) &&
      ts.isIdentifier(p.name) &&
      p.name.text === "alias" &&
      ts.isStringLiteralLike(p.initializer)
    ) {
      return p.initializer.text;
    }
  }
  return undefined;
}

/**
 * The JIT compiler only sees decorators, so signal inputs, models and outputs
 * get the matching @Input / @Output decorator, as the Angular CLI does in JIT mode.
 */
export function signalMembersToDecorators(ts: typeof TS): TS.TransformerFactory<TS.SourceFile> {
  return (context) => {
    const f = context.factory;
    const ngCore = (name: string) =>
      f.createPropertyAccessExpression(
        f.createCallExpression(f.createIdentifier("require"), undefined, [
          f.createStringLiteral("@angular/core"),
        ]),
        name,
      );

    const visit = (node: TS.Node): TS.Node => {
      if (ts.isPropertyDeclaration(node) && ts.isIdentifier(node.name)) {
        const info = signalKind(ts, node.initializer);
        if (info) {
          const name = node.name.text;
          const alias = aliasOf(ts, info.kind, info.required, info.call) ?? name;
          const decorators: TS.Decorator[] = [];
          if (info.kind === "input" || info.kind === "model") {
            decorators.push(
              f.createDecorator(
                f.createCallExpression(ngCore("Input"), undefined, [
                  f.createObjectLiteralExpression([
                    f.createPropertyAssignment("isSignal", f.createTrue()),
                    f.createPropertyAssignment("alias", f.createStringLiteral(alias)),
                    f.createPropertyAssignment(
                      "required",
                      info.required ? f.createTrue() : f.createFalse(),
                    ),
                    f.createPropertyAssignment("transform", f.createIdentifier("undefined")),
                  ]),
                ]),
              ),
            );
          }
          if (info.kind === "model" || info.kind === "output") {
            const outputName = info.kind === "model" ? `${alias}Change` : alias;
            decorators.push(
              f.createDecorator(
                f.createCallExpression(ngCore("Output"), undefined, [
                  f.createStringLiteral(outputName),
                ]),
              ),
            );
          }
          return f.updatePropertyDeclaration(
            node,
            [...decorators, ...(node.modifiers ?? [])],
            node.name,
            node.questionToken ?? node.exclamationToken,
            node.type,
            node.initializer,
          );
        }
      }
      return ts.visitEachChild(node, visit, context);
    };
    return (sf) => ts.visitNode(sf, visit) as TS.SourceFile;
  };
}
