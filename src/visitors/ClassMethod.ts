import { generateFlowTypeMaps } from "../utils/generateTsAstMaps";
import handleTsAst from "../utils/handleTsAst";
import type { Flow } from "@babel/types";
const t = require("@babel/types");

function typePromiseOrAnnotation(
  tsTypeAnotation: Flow | Flow[],
  async: boolean
) {
  return async
    ? t.TypeAnnotation(
        t.GenericTypeAnnotation(
          t.identifier("Promise"),
          t.typeParameterInstantiation(
            Array.isArray(tsTypeAnotation) ? tsTypeAnotation : [tsTypeAnotation]
          )
        )
      )
    : t.typeAnnotation(tsTypeAnotation);
}

export default function () {
  return {
    ClassMethod(path) {
      const tsAstTypes: Flow[] = [];
      const { body, async } = path.node;
      const returnAstNode = body.body?.find((node) =>
        t.isReturnStatement(node)
      );
      const { argument } = returnAstNode || {};
      if (t.isIdentifier(argument)) {
        const bindScopePath = path.scope.bindings[argument.name];
        path.node.returnType = typePromiseOrAnnotation(
          handleTsAst.Identifier(bindScopePath, tsAstTypes),
          async
        );
      } else {
        path.node.returnType = typePromiseOrAnnotation(
          argument?.type
            ? generateFlowTypeMaps[argument.type](argument, path)
            : t.voidTypeAnnotation(),
          async
        );
      }
    },
  };
}
