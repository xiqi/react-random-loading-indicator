import type {
  CSSProperties,
  ImgHTMLAttributes,
  ReactNode,
  VideoHTMLAttributes
} from 'react';

export type RandomMode = 'per-load' | 'continuous';
export type RandomStrategy = 'uniform' | 'weighted' | 'shuffle';
export type IdleBehavior = 'hidden' | 'last';

export interface IndicatorRenderContext {
  isActive: boolean;
  index: number;
  loading: boolean;
}

export interface BaseIndicatorSource {
  id?: string;
  weight?: number;
  className?: string;
  style?: CSSProperties;
}

export interface ImageIndicatorSource extends BaseIndicatorSource {
  type?: 'image';
  src: string;
  alt?: string;
  decoding?: ImgHTMLAttributes<HTMLImageElement>['decoding'];
  loading?: ImgHTMLAttributes<HTMLImageElement>['loading'];
  referrerPolicy?: ImgHTMLAttributes<HTMLImageElement>['referrerPolicy'];
  crossOrigin?: ImgHTMLAttributes<HTMLImageElement>['crossOrigin'];
  objectFit?: CSSProperties['objectFit'];
  width?: number | string;
  height?: number | string;
}

export interface VideoIndicatorSource extends BaseIndicatorSource {
  type: 'video';
  src: string;
  poster?: string;
  autoPlay?: VideoHTMLAttributes<HTMLVideoElement>['autoPlay'];
  loop?: VideoHTMLAttributes<HTMLVideoElement>['loop'];
  muted?: VideoHTMLAttributes<HTMLVideoElement>['muted'];
  playsInline?: VideoHTMLAttributes<HTMLVideoElement>['playsInline'];
  controls?: VideoHTMLAttributes<HTMLVideoElement>['controls'];
  objectFit?: CSSProperties['objectFit'];
  width?: number | string;
  height?: number | string;
}

export interface CustomIndicatorSource extends BaseIndicatorSource {
  type: 'custom';
  render: (context: IndicatorRenderContext) => ReactNode;
}

export type IndicatorSource =
  | string
  | ImageIndicatorSource
  | VideoIndicatorSource
  | CustomIndicatorSource;

export type IndicatorChangeReason = 'load-start' | 'interval' | 'source-update';

export interface IndicatorChangeEvent {
  index: number;
  source: IndicatorSource;
  reason: IndicatorChangeReason;
}

export interface RandomLoadingIndicatorProps {
  loading: boolean;
  sources: IndicatorSource[];
  mode?: RandomMode;
  intervalMs?: number;
  strategy?: RandomStrategy;
  seed?: string | number;
  avoidImmediateRepeat?: boolean;
  preload?: boolean;
  pauseWhenDocumentHidden?: boolean;
  idleBehavior?: IdleBehavior;
  fallback?: ReactNode;
  className?: string;
  style?: CSSProperties;
  sourceClassName?: string;
  sourceStyle?: CSSProperties;
  ariaLabel?: string;
  onIndicatorChange?: (event: IndicatorChangeEvent) => void;
}
