import type { GenerateTsAstMapsOption } from "../interface/generateTsAstMapsDto";
import type { KeyofObject, UnionFlowType } from "../interface";
import type {
  ObjectTypeProperty,
  ObjectTypeSpreadProperty,
  Identifier,
  FunctionTypeParam,
  TypeParameterDeclaration,
  FlowType,
  Node
} from "@babel/types";
const t = require("@babel/types");

//  js类型与ts ast映射关系
const generateTsAstMap: {
  [key: string]: (...args: unknown[]) => FlowType
} = {
  NumericLiteral: t.numberTypeAnnotation,
  StringLiteral: t.stringTypeAnnotation,
  BooleanLiteral: t.booleanTypeAnnotation,
  ArrowFunctionExpression: (node: TypeParameterDeclaration, params: Array<FunctionTypeParam>, rest: FunctionTypeParam, returnType: FlowType) => {
    // return t.functionTypeAnnotation(node, params, rest, returnType);

    return  t.functionTypeAnnotation(node, params, rest, returnType);
  },
  ObjectExpression: <
    T extends {
      init: {
        properties: Array<ObjectTypeProperty | ObjectTypeSpreadProperty>;
      };
    }
  >(
    node: T | ObjectTypeProperty[] | ObjectTypeSpreadProperty[],
    path,
    option?: GenerateTsAstMapsOption
  ) => {
    if (Array.isArray(node)) {
      return t.objectTypeAnnotation(node);
    } else {
      const {
        init: { properties },
      } = node;
      return t.objectTypeAnnotation(
        properties.map((propert: ObjectTypeProperty) => {
          if ((propert as ObjectTypeProperty).key) {
            return t.objectTypeProperty(
              t.stringLiteral((propert.key as Identifier)?.name || propert.key),
              generateTsAstMap[propert.value.type](node, path),
              option.optional ? t.variance("minus") : null
            );
          }
        })
      );
    }
  },
  AssignmentExpression: (node: UnionFlowType<Node, 'AssignmentExpression'>) => {
    const {
      right: { type },
    } = node;
    
    return generateTsAstMap[type](node);
  },
  MemberExpression: (node: UnionFlowType<Node, 'MemberExpression'>, path: any, option?: GenerateTsAstMapsOption) => {
    const {
      property
    } = node;
    const { parent } = path;
    if (property.type === 'Identifier') {
      const { name } = property
      return t.objectTypeProperty(
        t.stringLiteral(name),
        generateTsAstMap[parent.right.type](parent, path, option),
        option.optional ? t.variance("minus") : null
      );
    } else if (property.type === 'PrivateName') {

    } else { // expression 表达式

    }
  },
};

const baseTsAstMaps: string[] = [
  "NumberTypeAnnotation",
  "StringTypeAnnotation",
  "BooleanTypeAnnotation",
  "UnionTypeAnnotation"
];

// 对既有TSAst数据进行操作
const curdGenerateTsAstMap = {
  ObjectTypeAnnotation: (node: UnionFlowType<Node, 'ObjectTypeAnnotation'>, value: ObjectTypeProperty[] | ObjectTypeSpreadProperty[]) => {
    const { properties } = node;
    node.properties = properties.concat(value)
    return node;
  },
  // 基础类型转换成联合类型
  BaseTypeUnionAnnotation: (node: FlowType | FlowType[], value: FlowType | FlowType[]): UnionFlowType<Node, 'TupleTypeAnnotation'> => {
    return t.unionTypeAnnotation((Array.isArray(node) ? node : [node]).concat(value));
  },
};

export const generateTsAstMaps: KeyofObject<typeof generateTsAstMap> =
  generateTsAstMap;
export const curdGenerateTsAstMaps: KeyofObject<typeof curdGenerateTsAstMap> =
  curdGenerateTsAstMap;
export { baseTsAstMaps };
