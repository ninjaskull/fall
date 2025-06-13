const STATE_TIMEZONE_MAP: Record<string, string> = {
  // Eastern Time Zone
  'CT': 'EST', 'DE': 'EST', 'FL': 'EST', 'GA': 'EST', 'ME': 'EST',
  'MD': 'EST', 'MA': 'EST', 'NH': 'EST', 'NJ': 'EST', 'NY': 'EST',
  'NC': 'EST', 'OH': 'EST', 'PA': 'EST', 'RI': 'EST', 'SC': 'EST',
  'VT': 'EST', 'VA': 'EST', 'WV': 'EST',
  
  // Central Time Zone
  'AL': 'CST', 'AR': 'CST', 'IL': 'CST', 'IA': 'CST', 'KS': 'CST',
  'KY': 'CST', 'LA': 'CST', 'MN': 'CST', 'MS': 'CST', 'MO': 'CST',
  'NE': 'CST', 'ND': 'CST', 'OK': 'CST', 'SD': 'CST', 'TN': 'CST',
  'TX': 'CST', 'WI': 'CST',
  
  // Mountain Time Zone
  'AZ': 'MST', 'CO': 'MST', 'ID': 'MST', 'MT': 'MST', 'NV': 'MST',
  'NM': 'MST', 'UT': 'MST', 'WY': 'MST',
  
  // Pacific Time Zone
  'CA': 'PST', 'OR': 'PST', 'WA': 'PST',
  
  // Alaska Time Zone
  'AK': 'AKST',
  
  // Hawaii Time Zone
  'HI': 'HST'
};

const COUNTRY_TIMEZONE_MAP: Record<string, string> = {
  'US': 'EST', // Default to EST for US
  'USA': 'EST',
  'United States': 'EST',
  'Canada': 'EST',
  'CA': 'EST',
  'Mexico': 'CST',
  'MX': 'CST',
  'UK': 'GMT',
  'United Kingdom': 'GMT',
  'GB': 'GMT',
  'Germany': 'CET',
  'DE': 'CET',
  'France': 'CET',
  'FR': 'CET',
  'Japan': 'JST',
  'JP': 'JST',
  'Australia': 'AEST',
  'AU': 'AEST',
  'India': 'IST',
  'IN': 'IST',
  'China': 'CST',
  'CN': 'CST'
};

export function deriveTimezone(state?: string, country?: string): string {
  // First try to get timezone from state (for US)
  if (state) {
    const stateUpper = state.toUpperCase().trim();
    if (STATE_TIMEZONE_MAP[stateUpper]) {
      return STATE_TIMEZONE_MAP[stateUpper];
    }
  }
  
  // If no state match, try country
  if (country) {
    const countryKey = country.trim();
    if (COUNTRY_TIMEZONE_MAP[countryKey]) {
      return COUNTRY_TIMEZONE_MAP[countryKey];
    }
  }
  
  // If neither state nor country provides a match
  return 'NA';
}
