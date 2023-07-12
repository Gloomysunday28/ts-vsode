import {
  generateFlowTypeMaps,
  curdGenerateTsAstMaps,
  baseTsAstMaps,
} from "../utils/generateTsAstMaps";
import handleTsAstMaps from "./handleTsAstMaps";
import type { Flow, Node } from "@babel/types";
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

export const handleRerencePath = (referencePath, ClassMethodTsTypes) => {
  (referencePath || []).forEach((path) => {
    const containerNode = path.container;
    if (handleTsAstMaps[containerNode.type]) {
      handleTsAstMaps[containerNode.type]?.(
        containerNode,
        ClassMethodTsTypes,
        path
      );
    }
  });

  return ClassMethodTsTypes;
};

export const handlePath = (referencePath, ClassMethodTsTypes) => {
  referencePath?.path?.container.forEach((node) => {
    if (handleTsAstMaps[node.type]) {
      handleTsAstMaps[node.type]?.(
        node,
        ClassMethodTsTypes,
        referencePath?.path
      );
    }
  });

  if (ClassMethodTsTypes.length) {
    const returnASTNode = ClassMethodTsTypes[0]
    const restReferencePaths = referencePath.referencePaths?.filter(path => (
      path.key !== 'body' && path.key !== 'right'
    ))
    handleRerencePath(restReferencePaths, returnASTNode.properties)
    returnASTNode.properties = postmathClassMethodTsAst(returnASTNode.properties)
    
    return returnASTNode
  } else {
    return t.voidTypeAnnotation()
  }
};

export default {
  Identifier: (bindScopePath, ClassMethodTsTypes) => {
    return handlePath(bindScopePath, ClassMethodTsTypes)
  },
};
