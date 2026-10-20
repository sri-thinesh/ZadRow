export interface NavigationItem {
  id: string;
  label: string;
  href: string;
}

export interface BentoCardItem {
  id: string;
  tag: string;
  title: string;
  description: string;
  metric: string;
}

export interface MetricItem {
  label: string;
  value: string;
}

export interface MediaPlaceholderProps {
  type?: 'photo' | 'video' | 'gallery' | 'space';
  aspectRatio?: string;
  title?: string;
  subtitle?: string;
  dimensions?: string;
  className?: string;
  showAnimation?: boolean;
}
