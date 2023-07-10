import {
  generateFlowTypeMaps,
  generateTsTypeMaps
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
        path.node.returnType = handleTsAst.Identifier(bindScopePath, ClassMethodTsTypes)
      } else {
        path.node.returnType = generateTsTypeMaps[argument.type] ? 
          t.tsTypeAnnotation(generateTsTypeMaps[argument.type](argument, path.scope.bindings[argument.returnType.typeAnnotation.typeName.name], {
            tsTypes: ClassMethodTsTypes
          }))
          : t.typeAnnotation(
            argument?.type ? generateFlowTypeMaps[argument.type](argument) : t.voidTypeAnnotation()
          );
      }
    },
  };
}
