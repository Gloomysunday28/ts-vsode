import type { GenerateTsAstMapsOption } from "../interface/generateTsAstMapsDto";
import type { KeyofObject, UnionFlowType, LowCaseCame } from "../interface";
import handleTsAst, { handlePath } from "./handleTsAst";
import type {
  ObjectTypeProperty,
  ObjectTypeSpreadProperty,
  Identifier, // JSType
  FlowType,
  Node, // JSType
  Flow, // FlowType
  TSType, // TSType
} from "@babel/types";
const t = require("@babel/types");

// TSType与FlowType都可以作为类型

// js类型与Ts type的影射关系
const generateTsTypeMap: {
  [key: string]: (...args: unknown[]) => TSType | TSType[];
} = {
  TSNumberKeyword: t.tsNumberKeyword,
  TSStringKeyword: t.tsStringKeyword,
  TSBooleanKeyword: t.tsBooleanKeyword,
  NumericLiteral: t.tsNumberKeyword, // js表达式
  StringLiteral: t.tsStringKeyword,
  BooleanLiteral: t.tsBooleanKeyword,
  TsTypeParameterDeclaration: (params: UnionFlowType<Node, "Identifier">[]) => {
    return t.tsTypeParameterDeclaration(
      params.map((param) => {
        const type = (
          param.typeAnnotation as UnionFlowType<Node, "TSTypeAnnotation">
        ).typeAnnotation?.type;
        return type
          ? t.tsTypeParameter(
              t[
                (type.slice(0, 2).toLowerCase() + type.slice(2)) as LowCaseCame<
                  typeof type,
                  2
                >
              ]?.(),
              null,
              param.name
            )
          : null;
      })
    );
  },
  ObjectExpression: <
    T extends {
      init: {
        properties: Array<ObjectTypeProperty | ObjectTypeSpreadProperty>;
      };
      id: keyof Node;
    }
  >(
    node: T | ObjectTypeProperty[] | ObjectTypeSpreadProperty[],
    path,
    option?: GenerateTsAstMapsOption
  ) => {
    if (Array.isArray(node)) {
      return node[0];
    } else {
      const {
        init: { properties },
        id: key,
      } = node;
      return t.tsParenthesizedType(
        t.tsTypeLiteral(
          properties.map((propert: ObjectTypeProperty) => {
            if ((propert as ObjectTypeProperty).key) {
              return t.tsPropertySignature(
                key,
                t.tsTypeAnnotation(
                  generateTsTypeMap[propert.value.type](node, path)
                ),
                key
              );
            }
          })
        )
      );
    }
  },
  MemberExpression: (
    node: UnionFlowType<Node, "MemberExpression">,
    path: any,
    option?: GenerateTsAstMapsOption
  ) => {
    const { property } = node;
    const { parent } = path;
    if (property.type === "Identifier") {
      return t.tsPropertySignature(
        property,
        t.tsTypeAnnotation(
          generateTsTypeMap[parent.right.type](parent, path, option)
        ),
        property
      );
    } else if (property.type === "PrivateName") {
    } else {
      // expression 表达式
    }
  },
  ArrowFunctionExpression: (
    node: UnionFlowType<Flow, "ArrowFunctionExpression">,
    path,
    { tsTypes }: GenerateTsAstMapsOption
  ) => {
    const { params = [] } = node;
    const paramsType = generateTsTypeMap.TsTypeParameterDeclaration(params);

    return t.tsFunctionType(
      paramsType,
      params.map((param) => t.identifier(param.name)),
      handleTsAst.Identifier(path, tsTypes)
    );
  },
};

//  js类型与Flow ast映射关系
const generateFlowTypeMap: {
  [key: string]: (...args: unknown[]) => Flow | Flow[] | any;
} = {
  NumericLiteral: t.numberTypeAnnotation, // js表达式
  TSNumberKeyword: t.numberTypeAnnotation, // TS类型
  StringLiteral: t.stringTypeAnnotation,
  TSStringKeyword: t.stringTypeAnnotation,
  BooleanLiteral: t.booleanTypeAnnotation,
  TSBooleanKeyword: t.booleanTypeAnnotation,
  ParamterDeclaration: (params: UnionFlowType<Node, "Identifier">[]) => {
    return t.typeParameterDeclaration(
      params.map((param) =>
        t.typeParameter(
          t.typeAnnotation(
            generateFlowTypeMap[
              (param.typeAnnotation as UnionFlowType<Node, "TSTypeAnnotation">)
                .typeAnnotation?.type
            ]?.()
          )
        )
      )
    );
  },
  FunctionTypeParam: (params: UnionFlowType<Node, "Identifier">[]) => {
    return params?.map((param) =>
      t.functionTypeParam(
        t.identifier(param.name),
        generateFlowTypeMap[
          (param.typeAnnotation as UnionFlowType<Node, "TSTypeAnnotation">)
            .typeAnnotation?.type
        ]?.()
      )
    );
  },
  FunctionExpression: (
    node: UnionFlowType<Flow, "ArrowFunctionExpression">
  ) => {
    const { params } = node;
    const paramsType = generateFlowTypeMap.ParamterDeclaration(params);
    const functionParams = generateFlowTypeMap.FunctionTypeParam(params);
    const restParams = null;

    return t.functionTypeAnnotation(
      paramsType,
      functionParams,
      restParams,
      t.anyTypeAnnotation()
    );
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
              generateFlowTypeMap[propert.value.type](node, path),
              option?.optional ? t.variance("minus") : null
            );
          }
        })
      );
    }
  },
  ArrowFunctionExpression: (
    node: UnionFlowType<Node, "ArrowFunctionExpression">,
    path: any
  ) => {
    const { body } = node;
    if (t.isIdentifier(body)) {
      const { name } = body as UnionFlowType<Node, "Identifier">;
      const bindScopePath = path.scope.bindings[name];
      return t.functionTypeAnnotation(
        null,
        [],
        null,
        handlePath(bindScopePath, [])
      );
    } else if (generateFlowTypeMap[body.type]) {
      return generateFlowTypeMap[body.type](body, path);
    }
  },
  MemberExpression: (
    node: UnionFlowType<Node, "MemberExpression">,
    path: any,
    option?: GenerateTsAstMapsOption
  ) => {
    const { property } = node;
    const { parent } = path;
    if (property.type === "Identifier") {
      const { name } = property;
      return t.objectTypeProperty(
        t.stringLiteral(name),
        generateFlowTypeMap[parent.right?.type]?.(parent, path, option),
        option?.optional ? t.variance("minus") : null
      );
    } else if (property.type === "PrivateName") {
    } else {
      // expression 表达式
    }
  },
};

const baseTsAstMaps: string[] = [
  "NumberTypeAnnotation",
  "StringTypeAnnotation",
  "BooleanTypeAnnotation",
  "UnionTypeAnnotation",
  "BooleanLiteral",
];

// 对既有TSAst数据进行操作
const curdGenerateTsAstMap = {
  ObjectTypeAnnotation: (
    node: UnionFlowType<Node, "ObjectTypeAnnotation">,
    value: ObjectTypeProperty[] | ObjectTypeSpreadProperty[]
  ) => {
    const { properties } = node;
    node.properties = properties.concat(value);
    return node;
  },
  // 基础类型转换成联合类型
  BaseTypeUnionAnnotation: (
    node: FlowType | FlowType[],
    value: FlowType | FlowType[]
  ): UnionFlowType<Node, "TupleTypeAnnotation"> => {
    return t.unionTypeAnnotation(
      (Array.isArray(node) ? node : [node]).concat(value)
    );
  },
};

export const generateTsTypeMaps: KeyofObject<typeof generateTsTypeMap> =
  generateTsTypeMap;
export const generateFlowTypeMaps: KeyofObject<typeof generateFlowTypeMap> =
  generateFlowTypeMap;
export const curdGenerateTsAstMaps: KeyofObject<typeof curdGenerateTsAstMap> =
  curdGenerateTsAstMap;
export { baseTsAstMaps };
