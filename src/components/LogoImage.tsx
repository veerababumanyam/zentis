import React from 'react';
import { LOGO_PATHS, BRAND_NAME } from '../constants/branding';

interface LogoImageProps {
  /**
   * Size of the logo - determines which optimized image to use
   * - 'small': 16-48px (uses favicon versions)
   * - 'medium': 180px (uses apple-touch-icon)
   * - 'large': 192px+ (uses android chrome icons)
   * - 'original': 600px (uses original logo)
   */
  size?: 'small' | 'medium' | 'large' | 'original';

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Alt text for the image (defaults to "Zentis AI Logo")
   */
  alt?: string;

  /**
   * Width in pixels or CSS value
   */
  width?: number | string;

  /**
   * Height in pixels or CSS value
   */
  height?: number | string;

  /**
   * Whether to apply rounded corners
   */
  rounded?: boolean;

  /**
   * Additional props to pass to the img element
   */
  imgProps?: React.ImgHTMLAttributes<HTMLImageElement>;

  /**
   * Inline styles
   */
  style?: React.CSSProperties;
}

/**
 * Logo image component that automatically selects the appropriate
 * optimized logo size based on the size prop
 */
export const LogoImage: React.FC<LogoImageProps> = ({
  size = 'medium',
  className = '',
  alt = `${BRAND_NAME} Logo`,
  width,
  height,
  rounded = false,
  imgProps,
  style: styleProp,
}) => {
  // Select the appropriate logo path based on size
  const getLogoPath = () => {
    switch (size) {
      case 'small':
        return LOGO_PATHS.favicon48;
      case 'medium':
        return LOGO_PATHS.appleTouchIcon;
      case 'large':
        return LOGO_PATHS.androidChrome512;
      case 'original':
      default:
        return LOGO_PATHS.original;
    }
  };

  // Build className string
  const classNames = [
    className,
    rounded && 'rounded-lg',
  ].filter(Boolean).join(' ');

  // Build style object
  const finalStyle: React.CSSProperties = {
    width: width || undefined,
    height: height || undefined,
    ...styleProp,
    ...(imgProps?.style || {}),
  };

  return (
    <img
      src={getLogoPath()}
      alt={alt}
      className={classNames}
      style={finalStyle}
      {...imgProps}
    />
  );
};

/**
 * Preset logo component for common use cases
 */
export const Logo = {
  /** Small logo for favicons and tight spaces (48px) */
  Small: (props: Omit<LogoImageProps, 'size'>) => (
    <LogoImage size="small" width={48} height={48} {...props} />
  ),

  /** Medium logo for headers and navigation (180px) */
  Medium: (props: Omit<LogoImageProps, 'size'>) => (
    <LogoImage size="medium" width={180} height={180} {...props} />
  ),

  /** Large logo for landing pages and hero sections (512px) */
  Large: (props: Omit<LogoImageProps, 'size'>) => (
    <LogoImage size="large" width={512} height={512} {...props} />
  ),

  /** Full resolution original logo */
  Original: (props: Omit<LogoImageProps, 'size'>) => (
    <LogoImage size="original" {...props} />
  ),
};
