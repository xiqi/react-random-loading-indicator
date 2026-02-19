# react-random-loading-indicator

A React loading component that randomly displays indicators from your resource list.

## Install

```bash
npm install react-random-loading-indicator
```

## Quick Start

```tsx
import { RandomLoadingIndicator } from 'react-random-loading-indicator';

export function Demo({ loading }: { loading: boolean }) {
  return (
    <RandomLoadingIndicator
      loading={loading}
      sources={[
        '/loading/1.gif',
        '/loading/2.webp',
        '/loading/3.svg'
      ]}
      mode="per-load"
    />
  );
}
```

## Random Modes

- `per-load`: pick one random indicator every time loading starts
- `continuous`: keep changing indicators while loading is true

```tsx
<RandomLoadingIndicator
  loading={loading}
  sources={['/loading/a.gif', '/loading/b.gif', '/loading/c.gif']}
  mode="continuous"
  intervalMs={800}
/>
```

## Supported `sources` Formats

1. `string` URL (image)
2. `image` object
3. `video` object
4. `custom` renderer (for Lottie/Canvas/WebGL/etc.)

```tsx
<RandomLoadingIndicator
  loading={loading}
  strategy="weighted"
  sources={[
    '/loading/a.gif',
    { type: 'video', src: '/loading/wave.webm', weight: 2 },
    { type: 'custom', weight: 3, render: () => <div>Custom Loader</div> }
  ]}
/>
```

## Key Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `loading` | `boolean` | required | Whether loading is active |
| `sources` | `IndicatorSource[]` | required | Candidate resource list |
| `mode` | `'per-load' \| 'continuous'` | `'per-load'` | Random switching mode |
| `intervalMs` | `number` | `1200` | Switch interval in `continuous` mode |
| `strategy` | `'uniform' \| 'weighted' \| 'shuffle'` | `'uniform'` | Random strategy |
| `avoidImmediateRepeat` | `boolean` | `true` | Avoid immediate repeats |
| `seed` | `string \| number` | `undefined` | Deterministic random sequence |
| `preload` | `boolean` | `false` | Preload image resources |
| `idleBehavior` | `'hidden' \| 'last'` | `'hidden'` | Hide or keep last indicator after loading |
| `onIndicatorChange` | `(event) => void` | `undefined` | Callback on indicator change |

For full props, use the previewer.

## Previewer (Recommended)

```bash
npm run previewer
```

- Adjust all props visually
- Put local files in `previewer/public/assets`
- Use URLs like `/assets/1.svg` in the sources input
- Paste resource URLs and preview instantly
- Generate and copy ready-to-use code

## Local Development

```bash
npm install
npm run test
npm run build
```

## License

MIT
