export const APP_METADATA = {
  NAME: 'PropertyLedger',
  DESCRIPTION: 'Real estate investment tracking, honest numbers',
  DEFAULT_CSV_FILENAME: 'propertyledger-transactions.csv',
};

export const DATE_FORMATS = {
  DISPLAY_DATE: 'MMM d, yyyy',
  DISPLAY_MONTH: 'MMM yyyy',
  ISO_DATE: 'yyyy-MM-dd',
  ISO_MONTH: 'yyyy-MM',
};

export const DATA_LOGIC = {
  MONTH_NAMES: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  TAG_DELIMITERS: [' — ', ' - ', ': ', '/'],
  CATEGORIES: {
    INCOME: 'income',
    EXPENSE: 'expense',
    EQUITY: 'equity',
  },
  SPECIAL_TAGS: {
    RENT_INCOME: 'Rent Income',
    CLOSING_COSTS: 'Closing Costs',
    DOWN_PAYMENT: 'Down Payment',
  },
  DEFAULT_HISTORICAL_MONTHS: 6,
  DEFAULT_VACANCY_START: 'purchase_date',
};

export const CHART_CONFIG = {
  HEIGHT: 320,
  BAR_RADIUS: [4, 4, 0, 0] as [number, number, number, number],
  MAX_BAR_SIZE: 40,
  MARGINS: { top: 10, right: 0, left: 0, bottom: 0 },
  COLORS: {
    INCOME: 'var(--green)',
    EXPENSE: 'var(--red)',
    NET: 'var(--blue)',
    CUMULATIVE: 'var(--purple)',
    GRID: 'var(--border-subtle)',
    AXIS: 'var(--text-muted)',
  }
};

export const AUTH_CONFIG = {
  LOGIN_ROUTE: '/auth',
  LOCAL_STORAGE_THEME_KEY: 'theme',
};

export const UI_CONFIG = {
  RADIUS: {
    SM: 'var(--radius-sm)',
    MD: 'var(--radius-md)',
    LG: 'var(--radius-lg)',
  },
  SPACING: {
    PAGE_MARGIN: 24,
  }
};
