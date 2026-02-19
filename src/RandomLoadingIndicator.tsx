import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createSeededRandom } from './random';
import { pickNextIndex, type ShuffleState } from './selection';
import type {
  CustomIndicatorSource,
  ImageIndicatorSource,
  IndicatorChangeReason,
  IndicatorSource,
  RandomLoadingIndicatorProps,
  VideoIndicatorSource
} from './types';

type NormalizedImageSource = Omit<ImageIndicatorSource, 'type' | 'weight'> & {
  type: 'image';
  weight: number;
};

type NormalizedVideoSource = Omit<VideoIndicatorSource, 'weight'> & {
  weight: number;
};

type NormalizedCustomSource = Omit<CustomIndicatorSource, 'weight'> & {
  weight: number;
};

type NormalizedSource = NormalizedImageSource | NormalizedVideoSource | NormalizedCustomSource;

function joinClassNames(...values: Array<string | undefined>): string | undefined {
  const merged = values.filter(Boolean).join(' ').trim();
  return merged.length > 0 ? merged : undefined;
}

function normalizeSource(source: IndicatorSource): NormalizedSource {
  if (typeof source === 'string') {
    return {
      type: 'image',
      src: source,
      weight: 1
    };
  }

  if (source.type === 'video') {
    return {
      ...source,
      type: 'video',
      weight: source.weight ?? 1
    };
  }

  if (source.type === 'custom') {
    return {
      ...source,
      type: 'custom',
      weight: source.weight ?? 1
    };
  }

  return {
    ...source,
    type: 'image',
    weight: source.weight ?? 1
  };
}

function sourceSignature(sources: NormalizedSource[]): string {
  return sources
    .map((source, index) => {
      if (source.type === 'image') {
        return `${index}:img:${source.src}:${source.weight}`;
      }
      if (source.type === 'video') {
        return `${index}:video:${source.src}:${source.weight}`;
      }
      return `${index}:custom:${source.id ?? 'no-id'}:${source.weight}`;
    })
    .join('|');
}

function renderSourceNode(
  source: NormalizedSource,
  loading: boolean,
  index: number,
  ariaLabel: string,
  sourceClassName?: string,
  sourceStyle?: CSSProperties
): ReactNode {
  const mergedClassName = joinClassNames(sourceClassName, source.className);
  const mergedStyle = {
    ...sourceStyle,
    ...source.style
  };

  if (source.type === 'image') {
    return (
      <img
        src={source.src}
        alt={source.alt ?? ariaLabel}
        loading={source.loading}
        decoding={source.decoding}
        referrerPolicy={source.referrerPolicy}
        crossOrigin={source.crossOrigin}
        width={source.width}
        height={source.height}
        className={mergedClassName}
        style={{
          ...mergedStyle,
          objectFit: source.objectFit ?? mergedStyle.objectFit
        }}
      />
    );
  }

  if (source.type === 'video') {
    return (
      <video
        src={source.src}
        poster={source.poster}
        autoPlay={source.autoPlay ?? true}
        loop={source.loop ?? true}
        muted={source.muted ?? true}
        playsInline={source.playsInline ?? true}
        controls={source.controls ?? false}
        width={source.width}
        height={source.height}
        className={mergedClassName}
        style={{
          ...mergedStyle,
          objectFit: source.objectFit ?? mergedStyle.objectFit
        }}
      />
    );
  }

  return (
    <span className={mergedClassName} style={mergedStyle}>
      {source.render({
        isActive: true,
        index,
        loading
      })}
    </span>
  );
}

export function RandomLoadingIndicator({
  loading,
  sources,
  mode = 'per-load',
  intervalMs = 1200,
  strategy = 'uniform',
  seed,
  avoidImmediateRepeat = true,
  preload = false,
  pauseWhenDocumentHidden = true,
  idleBehavior = 'hidden',
  fallback = null,
  className,
  style,
  sourceClassName,
  sourceStyle,
  ariaLabel = 'Loading indicator',
  onIndicatorChange
}: RandomLoadingIndicatorProps) {
  const normalizedSources = useMemo(
    () => sources.map((source) => normalizeSource(source)),
    [sources]
  );
  const weights = useMemo(
    () => normalizedSources.map((source) => Math.max(0, source.weight)),
    [normalizedSources]
  );
  const sourceKey = useMemo(() => sourceSignature(normalizedSources), [normalizedSources]);
  const selectionKey = `${sourceKey}:${strategy}:${seed === undefined ? 'native' : String(seed)}:${avoidImmediateRepeat}`;

  const random = useMemo(
    () => (seed === undefined ? Math.random : createSeededRandom(seed)),
    [seed]
  );

  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const activeIndexRef = useRef<number | null>(null);
  const previousRef = useRef({
    loading: false,
    selectionKey: ''
  });
  const shuffleStateRef = useRef<ShuffleState>({
    queue: [],
    signature: ''
  });

  const selectNext = useCallback(
    (reason: IndicatorChangeReason) => {
      if (normalizedSources.length === 0) {
        activeIndexRef.current = null;
        setActiveIndex(null);
        return;
      }

      const nextIndex = pickNextIndex({
        total: normalizedSources.length,
        weights,
        strategy,
        previousIndex: activeIndexRef.current,
        avoidImmediateRepeat,
        random,
        shuffleState: shuffleStateRef.current,
        signature: selectionKey
      });

      if (nextIndex === null || nextIndex === activeIndexRef.current) {
        return;
      }

      activeIndexRef.current = nextIndex;
      setActiveIndex(nextIndex);
      onIndicatorChange?.({
        index: nextIndex,
        source: sources[nextIndex],
        reason
      });
    },
    [avoidImmediateRepeat, normalizedSources.length, onIndicatorChange, random, selectionKey, sources, strategy, weights]
  );

  useEffect(() => {
    const previous = previousRef.current;
    const selectionChanged = previous.selectionKey !== selectionKey;

    if (loading) {
      if (!previous.loading) {
        selectNext('load-start');
      } else if (selectionChanged || activeIndexRef.current === null || activeIndexRef.current >= normalizedSources.length) {
        selectNext('source-update');
      }
    } else if (previous.loading && idleBehavior === 'hidden') {
      activeIndexRef.current = null;
      setActiveIndex(null);
    }

    previousRef.current = {
      loading,
      selectionKey
    };
  }, [idleBehavior, loading, normalizedSources.length, selectNext, selectionKey]);

  useEffect(() => {
    if (normalizedSources.length > 0) {
      return;
    }
    activeIndexRef.current = null;
    setActiveIndex(null);
  }, [normalizedSources.length]);

  useEffect(() => {
    if (!loading || mode !== 'continuous' || normalizedSources.length < 2) {
      return;
    }

    const delay = Math.max(100, intervalMs);
    const timerId = window.setInterval(() => {
      if (pauseWhenDocumentHidden && typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }
      selectNext('interval');
    }, delay);

    return () => {
      window.clearInterval(timerId);
    };
  }, [intervalMs, loading, mode, normalizedSources.length, pauseWhenDocumentHidden, selectNext]);

  useEffect(() => {
    if (!preload || typeof window === 'undefined') {
      return;
    }

    const preloaders: HTMLImageElement[] = [];
    normalizedSources.forEach((source) => {
      if (source.type === 'image') {
        const image = new window.Image();
        if (source.crossOrigin) {
          image.crossOrigin = source.crossOrigin;
        }
        image.decoding = source.decoding ?? 'async';
        image.src = source.src;
        preloaders.push(image);
      }
    });

    return () => {
      preloaders.forEach((image) => {
        image.src = '';
      });
    };
  }, [normalizedSources, preload]);

  if (!loading && idleBehavior === 'hidden') {
    return null;
  }

  if (activeIndex === null) {
    return loading ? <>{fallback}</> : null;
  }

  const activeSource = normalizedSources[activeIndex];
  if (!activeSource) {
    return loading ? <>{fallback}</> : null;
  }

  const currentIndex = activeIndex;

  return (
    <span
      role="status"
      aria-live="polite"
      aria-busy={loading}
      aria-label={ariaLabel}
      className={className}
      style={style}
      data-rli-index={currentIndex}
    >
      {renderSourceNode(activeSource, loading, currentIndex, ariaLabel, sourceClassName, sourceStyle)}
    </span>
  );
}
