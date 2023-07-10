import {
  generateFlowTypeMaps,
  generateTsTypeMaps,
  curdGenerateTsAstMaps,
  baseTsAstMaps,
} from "../utils/generateTsAstMaps";
import type { Flow, Node, TSTypeElement, TSPropertySignature } from "@babel/types";
import { UnionFlowType, SureFlowType } from "../interface";
const t = require('@babel/types')

const postmathClassMethodTsAst = (ClassMethodTsTypes: Flow[], isTsType: boolean = false) => {
  const redundancFlowMap: Map<string, Flow | TSTypeElement> = new Map();
  const redundancFlowArray: Flow[] = [];

  ClassMethodTsTypes?.forEach((flow) => {
    if (
      (isTsType ? t.TSTypeAnnotation(flow) : t.isObjectTypeProperty(flow)) &&
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
        isTsType && SureFlowType<TSTypeElement, TSPropertySignature>(
          // @ts-ignore
        memoryFlowType.typeAnnotation.typeAnnotation
        )
      ) {
         // @ts-ignore
        memoryFlowType.typeAnnotation.typeAnnotation.types = curdGenerateTsAstMaps.BaseTypeUnionAnnotation(
           // @ts-ignore
          t.isTSUnionType(memoryFlowType.typeAnnotation.typeAnnotation) ? memoryFlowType.typeAnnotation.typeAnnotation.types : memoryFlowType.typeAnnotation.typeAnnotation,
          // @ts-ignore
          flow.typeAnnotation.typeAnnotation,
          isTsType
        );
      } else if (!isTsType && SureFlowType<Flow, UnionFlowType<Flow, "ObjectTypeProperty">>(
        // @ts-ignore
        memoryFlowType
      )) {
        memoryFlowType.value = curdGenerateTsAstMaps.BaseTypeUnionAnnotation(
          t.isUnionTypeAnnotation(memoryFlowType.value)
            ? (memoryFlowType.value as UnionFlowType<Node, 'UnionTypeAnnotation'>).types
            : memoryFlowType.value,
          flow.value,
          isTsType
        );
      }
    }
  });

  return !isTsType ? redundancFlowArray : redundancFlowArray.map(p => t.tsTypeAnnotation(t.TSParenthesizedType(t.tsTypeLiteral([p]))));
};
const handleRerencePath = (
  referencePath,
  generateTsFlowMaps,
  ClassMethodTsTypes,
  isTsType: boolean = false
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
            isTsType ? t.tsTypeAnnotation(generateTsFlowMaps[node.init.type](node, path, {
              optional: t.isBlockStatement(path.scope.block),
            })) :
              t.objectTypeProperty(
                t.stringLiteral(key),
                generateTsFlowMaps[node.init.type](node, path, {
                  optional: t.isBlockStatement(path.scope.block),
                })
              )
          );
        });

        const curentTsNode = (isTsType ? ClassMethodTsTypes[0].typeAnnotation.typeAnnotation.members : ClassMethodTsTypes).find(
          (tsnode) => tsnode.key[isTsType ? 'name' : 'value'] === property
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
  'Identifier': (bindScopePath, ClassMethodTsTypes, isTsType: boolean = false) => {
    const referencePath = bindScopePath.referencePaths.filter(
      (path) => !t.isReturnStatement(path.parentPath.node)
    );
    handleRerencePath(referencePath, isTsType ? generateTsTypeMaps : generateFlowTypeMaps, ClassMethodTsTypes, isTsType);
    const { type } = bindScopePath.path.node.init;
    let map: typeof generateFlowTypeMaps | typeof generateTsTypeMaps = generateFlowTypeMaps
    if (isTsType) {
      map = generateTsTypeMaps
    }
    const returnType = map[type]?.(
      postmathClassMethodTsAst(ClassMethodTsTypes, isTsType)
    );

    return returnType
  }
}