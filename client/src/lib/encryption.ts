// Client-side encryption utilities (for demonstration)
// In production, all encryption should be handled server-side

export function encryptData(data: string, key: string): string {
  // Simple XOR encryption for demonstration
  // In production, use proper encryption libraries
  let encrypted = '';
  for (let i = 0; i < data.length; i++) {
    encrypted += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return btoa(encrypted);
}

export function decryptData(encryptedData: string, key: string): string {
  try {
    const encrypted = atob(encryptedData);
    let decrypted = '';
    for (let i = 0; i < encrypted.length; i++) {
      decrypted += String.fromCharCode(encrypted.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return decrypted;
  } catch {
    return '';
  }
}
