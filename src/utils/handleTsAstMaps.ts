import {
  generateFlowTypeMaps,
  curdGenerateTsAstMaps,
  baseTsAstMaps,
} from "./generateTsAstMaps";
import type { Node, Flow } from '@babel/types'
import type { UnionFlowType } from '../interface'
import { handleRerencePath } from "./handleTsAst";
const t = require("@babel/types");

const getNodeProperty =  {
  AssignmentExpression: (node: UnionFlowType<Node, 'AssignmentExpression'>) => {
    const { right } = node

    return right
  },
  ExpressionStatement: (node: UnionFlowType<Node, 'ExpressionStatement'>) => {
    const { expression } = node

    if (t.isAssignmentExpression(expression)) {
      const { right } = expression as UnionFlowType<UnionFlowType<Node, 'ExpressionStatement'>, 'AssignmentExpression'>

      return right
    }
  },
}

const handleTsAstMaps =  {
  AssignmentExpression: (node: UnionFlowType<Node, 'AssignmentExpression'>, tsAstTypes: Flow[], path: any) => {
    const { left } = node
    
    if (handleTsAstMaps[left.type]) {
      handleTsAstMaps[left.type](left, tsAstTypes, path)
    }
  },
  VariableDeclarator: (node: UnionFlowType<Node, "VariableDeclarator">, tsAstTypes: Flow[], path) => {
    const { init } = node

    if (generateFlowTypeMaps[init.type]) {
      tsAstTypes.push(generateFlowTypeMaps[init.type](init, path))
    }
  },
  MemberExpression: (containerNode, tsAstTypes, path) => {
    const property = containerNode.property.name as string;
    const isIdentifier = t.isIdentifier(getNodeProperty[path.parentPath.container.type](path.parentPath.container));
    if (isIdentifier) {
      const variable = path.parentPath.scope.bindings[property];
      (variable.path.container || [])?.forEach((node) => {
        const key = node.id?.name;
        tsAstTypes.push(
          t.objectTypeProperty(
            t.stringLiteral(key),
            generateFlowTypeMaps[node.init.type](node.init, path, {
              optional: t.isBlockStatement(path.scope.block),
            })
          )
        );
      });

      if (Array.isArray(tsAstTypes)) {
        const curentTsNode = tsAstTypes.find(
          (tsnode) => tsnode.key.value === property
        );
        if (curentTsNode) {
          curentTsNode.value = curdGenerateTsAstMaps[
            baseTsAstMaps.includes(curentTsNode?.value?.type)
              ? "BaseTypeUnionAnnotation"
              : curentTsNode.value?.type
          ]?.(
            curentTsNode.value,
            handleRerencePath(
              variable.referencePaths?.filter((refer) => refer.key !== "right") ||
                [],
              []
            )
          );
        }
      }
    } else {
      const { parentPath } = path;
      tsAstTypes.push(
        generateFlowTypeMaps[parentPath.type](parentPath.node, parentPath, {
          optional: t.isBlockStatement(parentPath.scope.block),
        })
      );
    }
  },
};

export default handleTsAstMaps