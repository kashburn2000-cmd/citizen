export interface StateInfo {
  postal: string;
  fips: string;
  name: string;
  /** House seats after the 2020 apportionment. */
  seats: number;
}

export const STATES: StateInfo[] = [
  { postal: "AL", fips: "01", name: "Alabama", seats: 7 },
  { postal: "AK", fips: "02", name: "Alaska", seats: 1 },
  { postal: "AZ", fips: "04", name: "Arizona", seats: 9 },
  { postal: "AR", fips: "05", name: "Arkansas", seats: 4 },
  { postal: "CA", fips: "06", name: "California", seats: 52 },
  { postal: "CO", fips: "08", name: "Colorado", seats: 8 },
  { postal: "CT", fips: "09", name: "Connecticut", seats: 5 },
  { postal: "DE", fips: "10", name: "Delaware", seats: 1 },
  { postal: "FL", fips: "12", name: "Florida", seats: 28 },
  { postal: "GA", fips: "13", name: "Georgia", seats: 14 },
  { postal: "HI", fips: "15", name: "Hawaii", seats: 2 },
  { postal: "ID", fips: "16", name: "Idaho", seats: 2 },
  { postal: "IL", fips: "17", name: "Illinois", seats: 17 },
  { postal: "IN", fips: "18", name: "Indiana", seats: 9 },
  { postal: "IA", fips: "19", name: "Iowa", seats: 4 },
  { postal: "KS", fips: "20", name: "Kansas", seats: 4 },
  { postal: "KY", fips: "21", name: "Kentucky", seats: 6 },
  { postal: "LA", fips: "22", name: "Louisiana", seats: 6 },
  { postal: "ME", fips: "23", name: "Maine", seats: 2 },
  { postal: "MD", fips: "24", name: "Maryland", seats: 8 },
  { postal: "MA", fips: "25", name: "Massachusetts", seats: 9 },
  { postal: "MI", fips: "26", name: "Michigan", seats: 13 },
  { postal: "MN", fips: "27", name: "Minnesota", seats: 8 },
  { postal: "MS", fips: "28", name: "Mississippi", seats: 4 },
  { postal: "MO", fips: "29", name: "Missouri", seats: 8 },
  { postal: "MT", fips: "30", name: "Montana", seats: 2 },
  { postal: "NE", fips: "31", name: "Nebraska", seats: 3 },
  { postal: "NV", fips: "32", name: "Nevada", seats: 4 },
  { postal: "NH", fips: "33", name: "New Hampshire", seats: 2 },
  { postal: "NJ", fips: "34", name: "New Jersey", seats: 12 },
  { postal: "NM", fips: "35", name: "New Mexico", seats: 3 },
  { postal: "NY", fips: "36", name: "New York", seats: 26 },
  { postal: "NC", fips: "37", name: "North Carolina", seats: 14 },
  { postal: "ND", fips: "38", name: "North Dakota", seats: 1 },
  { postal: "OH", fips: "39", name: "Ohio", seats: 15 },
  { postal: "OK", fips: "40", name: "Oklahoma", seats: 5 },
  { postal: "OR", fips: "41", name: "Oregon", seats: 6 },
  { postal: "PA", fips: "42", name: "Pennsylvania", seats: 17 },
  { postal: "RI", fips: "44", name: "Rhode Island", seats: 2 },
  { postal: "SC", fips: "45", name: "South Carolina", seats: 7 },
  { postal: "SD", fips: "46", name: "South Dakota", seats: 1 },
  { postal: "TN", fips: "47", name: "Tennessee", seats: 9 },
  { postal: "TX", fips: "48", name: "Texas", seats: 38 },
  { postal: "UT", fips: "49", name: "Utah", seats: 4 },
  { postal: "VT", fips: "50", name: "Vermont", seats: 1 },
  { postal: "VA", fips: "51", name: "Virginia", seats: 11 },
  { postal: "WA", fips: "53", name: "Washington", seats: 10 },
  { postal: "WV", fips: "54", name: "West Virginia", seats: 2 },
  { postal: "WI", fips: "55", name: "Wisconsin", seats: 8 },
  { postal: "WY", fips: "56", name: "Wyoming", seats: 1 },
];

export const STATE_BY_POSTAL: Record<string, StateInfo> = Object.fromEntries(STATES.map((s) => [s.postal, s]));
export const STATE_BY_FIPS: Record<string, StateInfo> = Object.fromEntries(STATES.map((s) => [s.fips, s]));
export const TOTAL_HOUSE_SEATS = STATES.reduce((n, s) => n + s.seats, 0);

export function seatId(state: string, district: number): string {
  return `${state}-${String(district).padStart(2, "0")}`;
}

export function seatLabel(state: string, district: number): string {
  return district === 0 ? `${state}-AL` : `${state}-${district}`;
}
