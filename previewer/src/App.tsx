import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import {
  RandomLoadingIndicator,
  type IdleBehavior,
  type IndicatorChangeEvent,
  type RandomMode,
  type RandomStrategy
} from '../../src';

const defaultResourceInput = ['/assets/1.svg', '/assets/2.svg', '/assets/3.svg', '/assets/4.svg', '/assets/5.svg', '/assets/6.svg'].join(
  '\n'
);

interface ParameterDoc {
  name: string;
  type: string;
  defaultValue: string;
  required?: boolean;
  description: string;
  notes: string;
}

const parameterDocs: ParameterDoc[] = [
  {
    name: 'loading',
    type: 'boolean',
    defaultValue: 'n/a',
    required: true,
    description: 'Toggles active loading state.',
    notes: 'When false and idleBehavior is hidden, the indicator is not rendered.'
  },
  {
    name: 'sources',
    type: 'IndicatorSource[]',
    defaultValue: 'n/a',
    required: true,
    description: 'Candidate indicators used for random selection.',
    notes: 'Supports string URLs, image/video objects, or custom renderers.'
  },
  {
    name: 'mode',
    type: "'per-load' | 'continuous'",
    defaultValue: "'per-load'",
    description: 'Controls when the indicator changes.',
    notes: 'per-load picks once on start; continuous rotates while loading remains true.'
  },
  {
    name: 'intervalMs',
    type: 'number',
    defaultValue: '1200',
    description: 'Switch interval for continuous mode.',
    notes: 'Values are internally clamped to at least 100ms.'
  },
  {
    name: 'strategy',
    type: "'uniform' | 'weighted' | 'shuffle'",
    defaultValue: "'uniform'",
    description: 'Randomization strategy used when picking the next source.',
    notes: 'weighted only changes behavior when sources include weight values.'
  },
  {
    name: 'seed',
    type: 'string | number',
    defaultValue: 'undefined',
    description: 'Optional deterministic seed for repeatable random order.',
    notes: 'Useful for debugging and screenshot consistency.'
  },
  {
    name: 'avoidImmediateRepeat',
    type: 'boolean',
    defaultValue: 'true',
    description: 'Avoids selecting the same source twice in a row when possible.',
    notes: 'No effect when only one source exists.'
  },
  {
    name: 'preload',
    type: 'boolean',
    defaultValue: 'false',
    description: 'Preloads image resources for faster first display.',
    notes: 'Only applies to image sources.'
  },
  {
    name: 'pauseWhenDocumentHidden',
    type: 'boolean',
    defaultValue: 'true',
    description: 'Pauses interval switching when tab/document is hidden.',
    notes: 'Recommended to reduce background CPU usage.'
  },
  {
    name: 'idleBehavior',
    type: "'hidden' | 'last'",
    defaultValue: "'hidden'",
    description: 'Controls what happens after loading turns false.',
    notes: 'hidden removes the indicator; last keeps the last selected source visible.'
  },
  {
    name: 'fallback',
    type: 'ReactNode',
    defaultValue: 'null',
    description: 'Content shown when loading is true but no source is renderable.',
    notes: 'Configured here via enable toggle and fallback text.'
  },
  {
    name: 'className',
    type: 'string',
    defaultValue: 'undefined',
    description: 'Class name for the outer status container.',
    notes: 'Use for shell layout and decorative styling.'
  },
  {
    name: 'style',
    type: 'CSSProperties',
    defaultValue: 'undefined',
    description: 'Inline style object for the outer container.',
    notes: 'Enter a JSON object in this previewer.'
  },
  {
    name: 'sourceClassName',
    type: 'string',
    defaultValue: 'undefined',
    description: 'Class name applied to the selected source element.',
    notes: 'Useful for shared size/animation across media types.'
  },
  {
    name: 'sourceStyle',
    type: 'CSSProperties',
    defaultValue: 'undefined',
    description: 'Inline style object for the selected source element.',
    notes: 'Often used for width/height/objectFit.'
  },
  {
    name: 'ariaLabel',
    type: 'string',
    defaultValue: "'Loading indicator'",
    description: 'Accessible label announced by screen readers.',
    notes: 'Prefer context-specific labels such as "Loading dashboard data".'
  },
  {
    name: 'onIndicatorChange',
    type: '(event) => void',
    defaultValue: 'undefined',
    description: 'Callback fired when the active source changes.',
    notes: 'Event includes reason, index, and source.'
  }
];

const parameterDocMap = new Map(parameterDocs.map((doc) => [doc.name, doc]));

type JsonObject = Record<string, unknown>;

interface ParsedJsonObject {
  value: JsonObject | undefined;
  error: string | null;
}

interface BuildCodeSnippetConfig {
  sources: string[];
  mode: RandomMode;
  strategy: RandomStrategy;
  intervalMs: number;
  seed: string;
  avoidImmediateRepeat: boolean;
  preload: boolean;
  pauseWhenDocumentHidden: boolean;
  idleBehavior: IdleBehavior;
  fallbackEnabled: boolean;
  fallbackText: string;
  className: string;
  containerStyle: JsonObject | undefined;
  sourceClassName: string;
  sourceStyle: JsonObject | undefined;
  ariaLabel: string;
  onIndicatorChangeEnabled: boolean;
}

interface FieldProps {
  propName: string;
  children: ReactNode;
}

function Field({ propName, children }: FieldProps) {
  const doc = parameterDocMap.get(propName);
  const hasDefault = Boolean(doc?.defaultValue) && doc?.defaultValue.toLowerCase() !== 'n/a';

  return (
    <div className="field">
      <div className="field-head">
        <div className="field-title-row">
          <span className="field-label">{doc?.name ?? propName}</span>
          <div className="field-badges">
            <span className="field-chip">{doc?.type ?? 'unknown'}</span>
            {doc?.required ? <span className="field-chip field-chip-required">required</span> : null}
            {hasDefault ? (
              <span className="field-chip field-chip-muted">default: {doc?.defaultValue}</span>
            ) : null}
          </div>
        </div>
        {doc ? <p className="field-description">{doc.description}</p> : null}
        {doc ? <p className="field-note">{doc.notes}</p> : null}
      </div>
      {children}
    </div>
  );
}

function parseSources(input: string): string[] {
  return input
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\n')
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseEscapedText(input: string): string {
  return input
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
}

function toParsedJsonObject(value: unknown): ParsedJsonObject {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return {
      value: undefined,
      error: 'Must be a JSON object'
    };
  }

  return {
    value: value as JsonObject,
    error: null
  };
}

function parseJsonObject(input: string): ParsedJsonObject {
  const trimmed = input.trim();

  if (trimmed.length === 0) {
    return {
      value: undefined,
      error: null
    };
  }

  try {
    return toParsedJsonObject(JSON.parse(trimmed));
  } catch {}

  const escapedTextParsed = parseEscapedText(trimmed);

  if (escapedTextParsed !== trimmed) {
    try {
      return toParsedJsonObject(JSON.parse(escapedTextParsed));
    } catch {}
  }

  return {
    value: undefined,
    error: 'Invalid JSON'
  };
}

function escapeDoubleQuotes(value: string): string {
  return JSON.stringify(value).slice(1, -1);
}

function escapeSingleQuotes(value: string): string {
  return escapeDoubleQuotes(value).replace(/'/g, "\\'");
}

function stringifyObjectForCode(value: JsonObject): string {
  return JSON.stringify(value, null, 2);
}

function buildCodeSnippet(config: BuildCodeSnippetConfig): string {
  const sourceLines = config.sources.map((source) => `  '${escapeSingleQuotes(source)}',`).join('\n');

  const setupLines: string[] = [];

  if (config.containerStyle) {
    setupLines.push(`const containerStyle = ${stringifyObjectForCode(config.containerStyle)};`);
    setupLines.push('');
  }

  if (config.sourceStyle) {
    setupLines.push(`const indicatorSourceStyle = ${stringifyObjectForCode(config.sourceStyle)};`);
    setupLines.push('');
  }

  const propLines = ['      loading={loading}', '      sources={indicatorSources}'];

  if (config.mode !== 'per-load') {
    propLines.push(`      mode="${config.mode}"`);
  }

  if (config.intervalMs !== 1200) {
    propLines.push(`      intervalMs={${config.intervalMs}}`);
  }

  if (config.strategy !== 'uniform') {
    propLines.push(`      strategy="${config.strategy}"`);
  }

  if (config.seed.trim().length > 0) {
    propLines.push(`      seed="${escapeDoubleQuotes(config.seed.trim())}"`);
  }

  if (!config.avoidImmediateRepeat) {
    propLines.push('      avoidImmediateRepeat={false}');
  }

  if (config.preload) {
    propLines.push('      preload');
  }

  if (!config.pauseWhenDocumentHidden) {
    propLines.push('      pauseWhenDocumentHidden={false}');
  }

  if (config.idleBehavior !== 'hidden') {
    propLines.push(`      idleBehavior="${config.idleBehavior}"`);
  }

  if (config.fallbackEnabled) {
    propLines.push(
      `      fallback={<span>{'${escapeSingleQuotes(config.fallbackText || 'No active indicator')}'}</span>}`
    );
  }

  if (config.className.trim().length > 0) {
    propLines.push(`      className="${escapeDoubleQuotes(config.className.trim())}"`);
  }

  if (config.containerStyle) {
    propLines.push('      style={containerStyle}');
  }

  if (config.sourceClassName.trim().length > 0) {
    propLines.push(`      sourceClassName="${escapeDoubleQuotes(config.sourceClassName.trim())}"`);
  }

  if (config.sourceStyle) {
    propLines.push('      sourceStyle={indicatorSourceStyle}');
  }

  if (config.ariaLabel.trim().length > 0 && config.ariaLabel.trim() !== 'Loading indicator') {
    propLines.push(`      ariaLabel="${escapeDoubleQuotes(config.ariaLabel.trim())}"`);
  }

  if (config.onIndicatorChangeEnabled) {
    propLines.push('      onIndicatorChange={(event) => {');
    propLines.push("        console.log('[indicator-change]', event.reason, event.index);");
    propLines.push('      }}');
  }

  const setupBlock = setupLines.length > 0 ? `${setupLines.join('\n')}\n` : '';

  return `import { RandomLoadingIndicator } from 'react-random-loading-indicator';

const indicatorSources = [
${sourceLines}
];

${setupBlock}export function Example({ loading }: { loading: boolean }) {
  return (
    <RandomLoadingIndicator
${propLines.join('\n')}
    />
  );
}
`;
}

export function App() {
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<RandomMode>('per-load');
  const [strategy, setStrategy] = useState<RandomStrategy>('uniform');
  const [intervalMs, setIntervalMs] = useState(800);
  const [seed, setSeed] = useState('previewer-seed');
  const [avoidImmediateRepeat, setAvoidImmediateRepeat] = useState(true);
  const [preload, setPreload] = useState(true);
  const [pauseWhenDocumentHidden, setPauseWhenDocumentHidden] = useState(true);
  const [idleBehavior, setIdleBehavior] = useState<IdleBehavior>('hidden');
  const [fallbackEnabled, setFallbackEnabled] = useState(true);
  const [fallbackText, setFallbackText] = useState('No active indicator');
  const [className, setClassName] = useState('indicator-shell');
  const [containerStyleInput, setContainerStyleInput] = useState('');
  const [sourceClassName, setSourceClassName] = useState('');
  const [sourceStyleInput, setSourceStyleInput] = useState('');
  const [ariaLabel, setAriaLabel] = useState('Loading indicator');
  const [onIndicatorChangeEnabled, setOnIndicatorChangeEnabled] = useState(true);
  const [resourceInput, setResourceInput] = useState(defaultResourceInput);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [lastEvent, setLastEvent] = useState('No event yet');

  const sources = useMemo(() => parseSources(resourceInput), [resourceInput]);
  const safeIntervalMs = Math.max(100, intervalMs || 0);
  const parsedContainerStyle = useMemo(() => parseJsonObject(containerStyleInput), [containerStyleInput]);
  const parsedSourceStyle = useMemo(() => parseJsonObject(sourceStyleInput), [sourceStyleInput]);

  const generatedCode = useMemo(
    () =>
      buildCodeSnippet({
        sources,
        mode,
        strategy,
        intervalMs: safeIntervalMs,
        seed,
        avoidImmediateRepeat,
        preload,
        pauseWhenDocumentHidden,
        idleBehavior,
        fallbackEnabled,
        fallbackText,
        className,
        containerStyle: parsedContainerStyle.value,
        sourceClassName,
        sourceStyle: parsedSourceStyle.value,
        ariaLabel,
        onIndicatorChangeEnabled
      }),
    [
      ariaLabel,
      avoidImmediateRepeat,
      className,
      fallbackEnabled,
      fallbackText,
      idleBehavior,
      mode,
      onIndicatorChangeEnabled,
      parsedContainerStyle.value,
      parsedSourceStyle.value,
      pauseWhenDocumentHidden,
      preload,
      safeIntervalMs,
      seed,
      sourceClassName,
      sources,
      strategy
    ]
  );

  const summaryBadges = [`${mode}`, `${strategy}`, `${safeIntervalMs}ms`, `${sources.length} sources`];

  useEffect(() => {
    if (copyStatus === 'idle') {
      return;
    }

    const timer = window.setTimeout(() => {
      setCopyStatus('idle');
    }, 1800);

    return () => {
      window.clearTimeout(timer);
    };
  }, [copyStatus]);

  async function handleCopyCode() {
    try {
      await navigator.clipboard.writeText(generatedCode);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('failed');
    }
  }

  function handleIndicatorChange(event: IndicatorChangeEvent) {
    setLastEvent(`${event.reason} -> index ${event.index}`);
  }

  function applyPresetDynamic() {
    setMode('continuous');
    setStrategy('shuffle');
    setIntervalMs(350);
    setAvoidImmediateRepeat(true);
    setPreload(true);
    setPauseWhenDocumentHidden(true);
  }

  function applyPresetCalm() {
    setMode('per-load');
    setStrategy('uniform');
    setIntervalMs(1200);
    setAvoidImmediateRepeat(true);
    setPreload(false);
    setPauseWhenDocumentHidden(true);
  }

  const fallbackNode = fallbackEnabled ? (
    <span className="fallback">{fallbackText || 'No active indicator'}</span>
  ) : undefined;

  return (
    <main className="previewer-page">
      <div className="ambient ambient-top" />
      <div className="ambient ambient-bottom" />

      <header className="hero-card">
        <div>
          <h1>Random Loading Indicator Studio</h1>
        </div>
        <div className="hero-actions">
          <button type="button" className="ghost-btn" onClick={applyPresetCalm}>
            Calm Preset
          </button>
          <button type="button" className="primary-btn" onClick={applyPresetDynamic}>
            Dynamic Preset
          </button>
        </div>
      </header>

      <div className="workspace">
        <aside className="sidebar-column">
          <section className="card section-card">
            <div className="card-head">
              <h2>Sources</h2>
              <span className="badge-pill">{sources.length}</span>
            </div>
            <Field propName="sources">
              <textarea
                className="source-textarea"
                value={resourceInput}
                onChange={(event) => setResourceInput(event.target.value)}
                spellCheck={false}
                placeholder={`/assets/1.svg
/assets/2.svg
https://cdn.example.com/loader.gif`}
              />
            </Field>
          </section>

          <section className="card section-card">
            <div className="card-head">
              <h2>Core Settings</h2>
            </div>
            <div className="field-grid">
              <Field propName="loading">
                <input
                  type="checkbox"
                  checked={loading}
                  onChange={(event) => setLoading(event.target.checked)}
                />
              </Field>

              <Field propName="mode">
                <select value={mode} onChange={(event) => setMode(event.target.value as RandomMode)}>
                  <option value="per-load">per-load</option>
                  <option value="continuous">continuous</option>
                </select>
              </Field>

              <Field propName="intervalMs">
                <input
                  type="number"
                  min={100}
                  step={50}
                  value={intervalMs}
                  onChange={(event) => setIntervalMs(Number(event.target.value) || 800)}
                />
              </Field>

              <Field propName="strategy">
                <select
                  value={strategy}
                  onChange={(event) => setStrategy(event.target.value as RandomStrategy)}
                >
                  <option value="uniform">uniform</option>
                  <option value="weighted">weighted</option>
                  <option value="shuffle">shuffle</option>
                </select>
              </Field>
            </div>
          </section>

          <details className="card section-card advanced-card">
            <summary className="advanced-summary">
              <span className="advanced-title">Advanced Settings</span>
              <span className="advanced-hint">
                Optional behavior, appearance, accessibility, and style overrides
              </span>
            </summary>

            <div className="advanced-body">
              <h3 className="advanced-subtitle">Behavior Extensions</h3>
              <div className="field-grid">
                <Field propName="seed">
                  <input
                    type="text"
                    value={seed}
                    onChange={(event) => setSeed(event.target.value)}
                    placeholder="previewer-seed"
                  />
                </Field>

                <Field propName="avoidImmediateRepeat">
                  <input
                    type="checkbox"
                    checked={avoidImmediateRepeat}
                    onChange={(event) => setAvoidImmediateRepeat(event.target.checked)}
                  />
                </Field>

                <Field propName="preload">
                  <input
                    type="checkbox"
                    checked={preload}
                    onChange={(event) => setPreload(event.target.checked)}
                  />
                </Field>

                <Field propName="pauseWhenDocumentHidden">
                  <input
                    type="checkbox"
                    checked={pauseWhenDocumentHidden}
                    onChange={(event) => setPauseWhenDocumentHidden(event.target.checked)}
                  />
                </Field>

                <Field propName="idleBehavior">
                  <select
                    value={idleBehavior}
                    onChange={(event) => setIdleBehavior(event.target.value as IdleBehavior)}
                  >
                    <option value="hidden">hidden</option>
                    <option value="last">last</option>
                  </select>
                </Field>
              </div>

              <h3 className="advanced-subtitle">Appearance & Accessibility</h3>
              <div className="field-grid">
                <Field propName="fallback">
                  <div className="stacked-input">
                    <label className="inline-check">
                      <input
                        type="checkbox"
                        checked={fallbackEnabled}
                        onChange={(event) => setFallbackEnabled(event.target.checked)}
                      />
                      <span>Enable fallback</span>
                    </label>
                    <input
                      type="text"
                      value={fallbackText}
                      onChange={(event) => setFallbackText(event.target.value)}
                      placeholder="No active indicator"
                      disabled={!fallbackEnabled}
                    />
                  </div>
                </Field>

                <Field propName="className">
                  <input
                    type="text"
                    value={className}
                    onChange={(event) => setClassName(event.target.value)}
                    placeholder="indicator-shell"
                  />
                </Field>

                <Field propName="sourceClassName">
                  <input
                    type="text"
                    value={sourceClassName}
                    onChange={(event) => setSourceClassName(event.target.value)}
                    placeholder="optional"
                  />
                </Field>

                <Field propName="ariaLabel">
                  <input
                    type="text"
                    value={ariaLabel}
                    onChange={(event) => setAriaLabel(event.target.value)}
                    placeholder="Loading indicator"
                  />
                </Field>

                <Field propName="onIndicatorChange">
                  <input
                    type="checkbox"
                    checked={onIndicatorChangeEnabled}
                    onChange={(event) => setOnIndicatorChangeEnabled(event.target.checked)}
                  />
                </Field>
              </div>

              <h3 className="advanced-subtitle">Style Objects</h3>
              <div className="json-stack">
                <Field propName="style">
                  <textarea
                    value={containerStyleInput}
                    onChange={(event) => setContainerStyleInput(event.target.value)}
                    spellCheck={false}
                    placeholder={`{
  "padding": 8
}`}
                  />
                  {parsedContainerStyle.error ? (
                    <p className="input-error">style: {parsedContainerStyle.error}</p>
                  ) : null}
                </Field>

                <Field propName="sourceStyle">
                  <textarea
                    value={sourceStyleInput}
                    onChange={(event) => setSourceStyleInput(event.target.value)}
                    spellCheck={false}
                    placeholder={`{
  "width": 96,
  "height": 96
}`}
                  />
                  {parsedSourceStyle.error ? (
                    <p className="input-error">sourceStyle: {parsedSourceStyle.error}</p>
                  ) : null}
                </Field>
              </div>
            </div>
          </details>

        </aside>

        <section className="main-column">
          <article className="card stage-card">
            <div className="card-head">
              <h2>Live Preview</h2>
              <div className="badge-row">
                {summaryBadges.map((badge) => (
                  <span key={badge} className="status-badge">
                    {badge}
                  </span>
                ))}
              </div>
            </div>

            <div className="preview-stage">
              <RandomLoadingIndicator
                loading={loading}
                sources={sources}
                mode={mode}
                intervalMs={safeIntervalMs}
                strategy={strategy}
                seed={seed.trim().length > 0 ? seed : undefined}
                avoidImmediateRepeat={avoidImmediateRepeat}
                preload={preload}
                pauseWhenDocumentHidden={pauseWhenDocumentHidden}
                idleBehavior={idleBehavior}
                fallback={fallbackNode}
                className={className.trim().length > 0 ? className : undefined}
                style={parsedContainerStyle.value as CSSProperties | undefined}
                sourceClassName={sourceClassName.trim().length > 0 ? sourceClassName : undefined}
                sourceStyle={parsedSourceStyle.value as CSSProperties | undefined}
                ariaLabel={ariaLabel.trim().length > 0 ? ariaLabel : undefined}
                onIndicatorChange={onIndicatorChangeEnabled ? handleIndicatorChange : undefined}
              />
            </div>

            <p className="event-line">Last event: {lastEvent}</p>
          </article>

          <article className="card code-card">
            <div className="card-head">
              <h2>Generated Code</h2>
              <button type="button" className="primary-btn" onClick={handleCopyCode}>
                Copy
              </button>
            </div>
            <pre>
              <code>{generatedCode}</code>
            </pre>
            {copyStatus === 'copied' ? <p className="copy-state success">Copied to clipboard.</p> : null}
            {copyStatus === 'failed' ? (
              <p className="copy-state error">Copy failed. Please copy manually.</p>
            ) : null}
          </article>

          <article className="card author-card">
            <p>
              Created by{' '}
              <a className="author-name-link" href="https://imxiqi.com" target="_blank" rel="noreferrer">
                Qi Xi
              </a>
            </p>
            <a
              className="author-project-link"
              href="https://github.com/xiqi/react-random-loading-indicator"
              target="_blank"
              rel="noreferrer"
            >
              Project on GitHub
            </a>
          </article>
        </section>
      </div>
    </main>
  );
}
