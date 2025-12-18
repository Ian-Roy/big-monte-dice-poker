export const CASINO_NAMES = [
  'Lady Luck',
  'Lucky Seven',
  'High Roller',
  'Ace High',
  'Big Slick',
  'Pocket Rockets',
  'Jack of Hearts',
  'Jack of Spades',
  'Jack of Diamonds',
  'Jack of Clubs',
  'Queen of Hearts',
  'Queen of Spades',
  'Queen of Diamonds',
  'Queen of Clubs',
  'King of Hearts',
  'King of Spades',
  'King of Diamonds',
  'King of Clubs',
  'Ace of Hearts',
  'Ace of Spades',
  'Ace of Diamonds',
  'Ace of Clubs',
  "Dealer's Choice",
  'The Croupier',
  'The Pit Boss',
  'The Floor Manager',
  'The Card Shark',
  'The Felt Phantom',
  'The Table Captain',
  'The House Favorite',
  'The House Edge',
  'The Comp Collector',
  'Double Down Danny',
  'Split Pair Sally',
  'Blackjack Baron',
  'Blackjack Queen',
  'Roulette Royal',
  'Roulette King',
  'The Spin Doctor',
  'The Wheel Whisperer',
  'The Big Wheel',
  'The Slot Sage',
  'The Reel Dealer',
  'The Progressive Prince',
  'The Jackpot Jester',
  'Neon Jackpot',
  'Midnight Gambler',
  'Riverboat Ranger',
  'The River King',
  'The Flop Father',
  'The Turn Titan',
  'The River Rat',
  'The Button Boss',
  'The Big Blind Bandit',
  'The Small Blind Sage',
  'Ante Up Annie',
  'Blind Raise Benny',
  'All-In Artist',
  'Slow Roll Sam',
  'Stack Attack',
  'Chip Whisperer',
  'Chip Runner',
  'Cash Cage Keeper',
  'Vault Keeper',
  'Marker Master',
  'VIP Host',
  'Velvet Rope',
  'Lucky Clover',
  'Golden Goose',
  'Silver Dollar',
  'Brass Token',
  'Diamond Dealer',
  'Sapphire Spinner',
  'Emerald Enigma',
  'Ruby Renegade',
  'Lucky Penny',
  'Lucky Star',
  'Neon Ace',
  'Triple Seven',
  'Snake Eyes',
  'Boxcars',
  'Hard Eight',
  'Midnight Roulette',
  'Dice Duke',
  'Dice Duchess',
  'Dice Whisperer',
  'Dice Doctor',
  'Full House Freddie',
  'Straight Shooter',
  'Flush Commander',
  'Royal Flush',
  'Straight Flush',
  'Four of a Kind',
  'High Card Hero',
  'Hot Streak',
  'Cold Deck',
  'Long Shot',
  'Sure Thing',
  'Bonus Round',
  'Big Bet',
  'House Rules',
  'Pit Runner',
  'Table Talk',
  'Dealer Button',
  'Cut Card',
  'Shuffle Master',
  'The Bankroll',
  'The Toke',
  'The Lucky Break'
] as const;

export type CasinoName = (typeof CASINO_NAMES)[number];

function randomIndex(maxExclusive: number, rng: () => number) {
  return Math.floor(rng() * maxExclusive);
}

export function pickRandomCasinoName(options?: { exclude?: Set<string>; rng?: () => number }): string {
  const rng = options?.rng ?? Math.random;
  const exclude = options?.exclude;
  if (!exclude || exclude.size === 0) {
    return CASINO_NAMES[randomIndex(CASINO_NAMES.length, rng)] ?? 'Player';
  }

  for (let tries = 0; tries < 50; tries += 1) {
    const candidate = CASINO_NAMES[randomIndex(CASINO_NAMES.length, rng)];
    if (candidate && !exclude.has(candidate)) return candidate;
  }

  return `Player ${exclude.size + 1}`;
}

export function buildDefaultPlayerNames(playerCount: number, options?: { rng?: () => number }): string[] {
  const clamped = Math.max(1, Math.min(4, Math.floor(playerCount)));
  const exclude = new Set<string>();
  const names: string[] = [];
  for (let idx = 0; idx < clamped; idx += 1) {
    const next = pickRandomCasinoName({ exclude, rng: options?.rng });
    exclude.add(next);
    names.push(next);
  }
  return names;
}

