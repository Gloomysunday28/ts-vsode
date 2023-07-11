import {
  generateFlowTypeMaps,
} from "../utils/generateTsAstMaps";
import handleTsAst from "../utils/handleTsAst";
import type { Flow } from "@babel/types";
const t = require("@babel/types");

export default function () {
  return {
    ClassMethod(path) {
      const ClassMethodTsTypes: Flow[] = [];
      const { body } = path.node;
      const returnAstNode = body.body?.find((node) =>
        t.isReturnStatement(node)
      );
      const { argument } = returnAstNode || {};
      if (argument?.type === "Identifier") {
        const bindScopePath = path.scope.bindings[argument.name];
        path.node.returnType = handleTsAst.Identifier(
          bindScopePath,
          ClassMethodTsTypes
        );
      } else {
        path.node.returnType = t.typeAnnotation(
          argument?.type
            ? generateFlowTypeMaps[argument.type](argument, path)
            : t.voidTypeAnnotation()
        );
      }
    },
  };
}
