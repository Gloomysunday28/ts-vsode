import generate from '@babel/generator'
import { parseAst } from './utils/parse';
import { traverseAst } from './utils/traverse'
import visitors from './visitors'

const code = `import ReactLynx, { Component } from '@byted-lynx/react-runtime';
import { MIcon } from '@/components/MIcon';
import { Image } from '@byted-poi/reactlynx-components';
import { QualityRules } from '@/components/QualityRules';
import './index.scss';

export default class ScoreDetailPage extends Component<
  {
    current_score: number;
  },
  {
    score?: number;
  }
> {
  state = {
    score: void 0,
  };

  raFrameScore = (current_score: number) => {
    const getScore = () => {
      return 321
    };

    return getScore
  }

  c(params: number) {
    const obj = {}
    const f = {
      d: 2,
      g: 'fg',
      hsdfa: true
    }
    f.h = 3
    obj.f = f
    var d = true
    // d = 2
    if (true) {
      obj.a = 2
    }
    obj.a = '1'
    obj.a = true
    obj.s = 'gdsag'
    obj.s = 2
    obj.s = false
    obj.d = d
    obj.f = 'true'
    return () => obj.s
  }
}
`;

const ast = parseAst(code);

traverseAst(ast, visitors);

const { code: codes } = generate(ast)

codes

