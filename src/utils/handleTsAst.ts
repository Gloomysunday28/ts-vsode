import {
  generateFlowTypeMaps,
  curdGenerateTsAstMaps,
  baseTsAstMaps,
} from "../utils/generateTsAstMaps";
import type {
  Flow,
  Node,
  TSTypeElement,
  TSPropertySignature,
} from "@babel/types";
import { UnionFlowType, SureFlowType } from "../interface";
const t = require("@babel/types");

const postmathClassMethodTsAst = (ClassMethodTsTypes: Flow[]) => {
  const redundancFlowMap: Map<string, Flow> = new Map();
  const redundancFlowArray: Flow[] = [];

  ClassMethodTsTypes?.forEach((flow) => {
    if (
      t.isObjectTypeProperty(flow) &&
      SureFlowType<Flow, UnionFlowType<Flow, "ObjectTypeProperty">>(flow)
    ) {
      const { value } = (flow as UnionFlowType<Flow, "ObjectTypeProperty">)
        .key as UnionFlowType<
        UnionFlowType<Flow, "ObjectTypeProperty">["key"],
        "StringLiteral"
      >;
      const memoryFlowType = redundancFlowMap.get(value);
      if (!memoryFlowType) {
        redundancFlowArray.push(flow);
        redundancFlowMap.set(value, flow);
      } else if (
        SureFlowType<Flow, UnionFlowType<Flow, "ObjectTypeProperty">>(
          memoryFlowType
        )
      ) {
        memoryFlowType.value = curdGenerateTsAstMaps.BaseTypeUnionAnnotation(
          t.isUnionTypeAnnotation(memoryFlowType.value)
            ? (
                memoryFlowType.value as UnionFlowType<
                  Node,
                  "UnionTypeAnnotation"
                >
              ).types
            : memoryFlowType.value,
          flow.value
        );
      }
    }
  });

  return redundancFlowArray;
};
const handleRerencePath = (
  referencePath,
  generateTsFlowMaps,
  ClassMethodTsTypes
) => {
  (referencePath || []).forEach((path) => {
    const containerNode = path.container;
    if (t.isMemberExpression(containerNode)) {
      const property = containerNode.property.name as string;
      const isIdentifier = t.isIdentifier(path.parentPath.container.right);
      if (isIdentifier) {
        const variable = path.parentPath.scope.bindings[property];
        (variable.path.container || [])?.forEach((node) => {
          const key = node.id?.name;
          ClassMethodTsTypes.push(
            t.objectTypeProperty(
              t.stringLiteral(key),
              generateTsFlowMaps[node.init.type](node, path, {
                optional: t.isBlockStatement(path.scope.block),
              })
            )
          );
        });

        const curentTsNode = ClassMethodTsTypes.find(
          (tsnode) => tsnode.key.value === property
        );
        if (curentTsNode) {
          curentTsNode.value = curdGenerateTsAstMaps[
            baseTsAstMaps.includes(curentTsNode.value?.type)
              ? "BaseTypeUnionAnnotation"
              : curentTsNode.value?.type
          ]?.(
            curentTsNode.value,
            handleRerencePath(
              variable.referencePaths?.filter(
                (refer) => refer.key !== "right"
              ) || [],
              generateTsFlowMaps,
              []
            )
          );
        }
      } else {
        const { parentPath } = path;
        ClassMethodTsTypes.push(
          generateTsFlowMaps[parentPath.type](parentPath.node, parentPath, {
            optional: t.isBlockStatement(parentPath.scope.block),
          })
        );
      }
    }
  });

  return ClassMethodTsTypes;
};

export default {
  Identifier: (bindScopePath, ClassMethodTsTypes) => {
    const referencePath = bindScopePath.referencePaths.filter(
      (path) => !t.isReturnStatement(path.parentPath.node)
    );
    handleRerencePath(referencePath, generateFlowTypeMaps, ClassMethodTsTypes);
    const { type } = bindScopePath.path.node.init;
    const returnType = generateFlowTypeMaps[type]?.(
      postmathClassMethodTsAst(ClassMethodTsTypes)
    );

    return returnType;
  },
};
