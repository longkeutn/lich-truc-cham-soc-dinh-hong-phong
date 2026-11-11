'use client';

import React from 'react';
import { motion } from 'motion/react';

export interface TabViewPanelProps {
  isActive: boolean;
  className?: string;
  children: React.ReactNode;
}

/**
 * Khung chuyển đổi Tab giữ nguyên DOM sau khi đã mở để phản hồi 0ms,
 * kết hợp hiệu ứng mờ dần kèm trượt nhẹ chuẩn đặc tả Motion (180ms easeOut).
 */
export function TabViewPanel({
  isActive,
  className = '',
  children,
}: TabViewPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      aria-hidden={!isActive}
      className={isActive ? `block ${className}`.trim() : 'hidden'}
    >
      {children}
    </motion.div>
  );
}

export default TabViewPanel;
