/**
 * Number formatting utilities
 */

export function formatNumber(num: number): string {
  if (num === 0) return '0';
  if (num < 0) return '-' + formatNumber(-num);
  
  const absNum = Math.abs(num);
  
  if (absNum >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(1) + 'B';
  }
  if (absNum >= 1_000_000) {
    return (num / 1_000_000).toFixed(1) + 'M';
  }
  if (absNum >= 1_000) {
    return (num / 1_000).toFixed(1) + 'K';
  }
  
  return num.toString();
}

export function formatNumberExact(num: number): string {
  return num.toLocaleString();
}

/**
 * Time formatting utilities
 */

export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function formatFullTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString();
}

/**
 * Duration formatting
 */

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}
