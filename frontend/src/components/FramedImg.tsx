import React from 'react';
import { frameStyle, parseFrame } from '../utils/frame';

type Props = Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> & { src?: string | null };

/** <img> that fills its box and honours the zoom/position the admin chose for this image. */
export const FramedImg: React.FC<Props> = ({ src, style, className, ...rest }) => {
  const { src: clean, frame } = parseFrame(src);
  if (!clean) return null;
  return <img src={clean} className={`w-full h-full ${className || ''}`} style={{ ...frameStyle(frame), ...style }} {...rest} />;
};
