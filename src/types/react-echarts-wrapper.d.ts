declare module 'echarts-for-react' {
  import { EChartsOption } from 'echarts';
  import { CSSProperties } from 'react';

  export interface ReactEChartsProps {
    option: EChartsOption;
    style?: CSSProperties;
    className?: string;
    theme?: string | object;
    notMerge?: boolean;
    lazyUpdate?: boolean;
    onEvents?: Record<string, Function>;
    opts?: {
      renderer?: 'canvas' | 'svg';
      width?: number | string;
      height?: number | string;
      locale?: string;
    };
  }

  const ReactECharts: React.FC<ReactEChartsProps>;
  export default ReactECharts;
}
