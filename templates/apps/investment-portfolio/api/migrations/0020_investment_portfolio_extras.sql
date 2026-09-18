-- Extends the squashed 0010 migration with the columns the
-- investment-portfolio handlers actually expect, plus seed data so a
-- fresh user lands on a populated News page and can navigate to real
-- AssetDetail pages without hitting "no data" placeholders.
--
-- Idempotent: every statement uses IF NOT EXISTS / ON CONFLICT so this
-- migration is safe to re-run on an existing database.

-- ----- notifications: add the per-user columns the UI needs --------

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS type text;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS body text;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS href text;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS unread boolean DEFAULT true;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS read boolean DEFAULT false;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS data jsonb;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();

CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON public.notifications USING btree (user_id);
CREATE INDEX IF NOT EXISTS notifications_user_created_at_idx
  ON public.notifications USING btree (user_id, created_at DESC);

-- ----- notification_preferences: per-user toggles for Settings -----

CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    price_alerts boolean DEFAULT true,
    rebalance_drift boolean DEFAULT true,
    dividends_paid boolean DEFAULT true,
    tax_docs_ready boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    PRIMARY KEY (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS notification_preferences_user_id_idx
  ON public.notification_preferences USING btree (user_id);

-- ----- user_settings: tax method, advisor email --------------------

CREATE TABLE IF NOT EXISTS public.user_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    advisor_email text,
    tax_method text DEFAULT 'FIFO',
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    PRIMARY KEY (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS user_settings_user_id_idx
  ON public.user_settings USING btree (user_id);

-- ----- target_allocations: rebalance fixtures --------------------

-- Already created in 0010; nothing to add.

-- ----- assets: seed a public catalog with rich detail -------------
--
-- The /api/assets/:symbol endpoint reads from this table, falling
-- back to the user's holdings row if the symbol isn't in the public
-- catalog. Seeding ~25 popular tickers means freshly-signed-up users
-- can navigate to /assets/AAPL etc. and see real fundamentals.

INSERT INTO public.assets
  (symbol, name, asset_class, description,
   last_price_cents, market_price_cents,
   fifty_two_week_high_cents, fifty_two_week_low_cents,
   pe_ratio, market_cap_cents, dividend_yield_pct, history_30d)
VALUES
  ('AAPL',  'Apple Inc.',                          'US Equity',     'Designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide; runs the App Store, Apple Music, iCloud, Apple Pay, and other services.', 21380, 21380, 23410, 16240,  31.42, 320000000000000, 0.51,
    '[{"date":"2026-04-09","price_cents":20120},{"date":"2026-04-10","price_cents":20284},{"date":"2026-04-11","price_cents":20418},{"date":"2026-04-12","price_cents":20602},{"date":"2026-04-13","price_cents":20488},{"date":"2026-04-14","price_cents":20710},{"date":"2026-04-15","price_cents":20815},{"date":"2026-04-16","price_cents":20940},{"date":"2026-04-17","price_cents":20888},{"date":"2026-04-18","price_cents":21024},{"date":"2026-04-19","price_cents":21115},{"date":"2026-04-20","price_cents":21000},{"date":"2026-04-21","price_cents":21142},{"date":"2026-04-22","price_cents":21218},{"date":"2026-04-23","price_cents":21290},{"date":"2026-04-24","price_cents":21260},{"date":"2026-04-25","price_cents":21320},{"date":"2026-04-26","price_cents":21380}]'::jsonb),
  ('MSFT',  'Microsoft Corp.',                     'US Equity',     'Develops Windows, Office, and Azure cloud services; serves enterprises with productivity software, AI infrastructure, and gaming via Xbox.',                                   44218, 44218, 46920, 35140,  35.21, 320000000000000, 0.78,
    '[{"date":"2026-04-09","price_cents":42100},{"date":"2026-04-10","price_cents":42420},{"date":"2026-04-11","price_cents":42810},{"date":"2026-04-12","price_cents":43180},{"date":"2026-04-13","price_cents":43020},{"date":"2026-04-14","price_cents":43320},{"date":"2026-04-15","price_cents":43480},{"date":"2026-04-16","price_cents":43620},{"date":"2026-04-17","price_cents":43480},{"date":"2026-04-18","price_cents":43820},{"date":"2026-04-19","price_cents":43980},{"date":"2026-04-20","price_cents":43840},{"date":"2026-04-21","price_cents":44020},{"date":"2026-04-22","price_cents":44120},{"date":"2026-04-23","price_cents":44190},{"date":"2026-04-24","price_cents":44150},{"date":"2026-04-25","price_cents":44210},{"date":"2026-04-26","price_cents":44218}]'::jsonb),
  ('GOOGL', 'Alphabet Inc.',                       'US Equity',     'Operates Google Search, YouTube, Android, and Google Cloud; advertising remains the dominant revenue driver, with growing AI and cloud segments.',                              17612, 17612, 18210, 13820,  24.81, 215000000000000, 0.42,
    '[{"date":"2026-04-09","price_cents":16920},{"date":"2026-04-10","price_cents":17020},{"date":"2026-04-11","price_cents":17110},{"date":"2026-04-12","price_cents":17240},{"date":"2026-04-13","price_cents":17080},{"date":"2026-04-14","price_cents":17280},{"date":"2026-04-15","price_cents":17380},{"date":"2026-04-16","price_cents":17480},{"date":"2026-04-17","price_cents":17400},{"date":"2026-04-18","price_cents":17520},{"date":"2026-04-19","price_cents":17580},{"date":"2026-04-20","price_cents":17480},{"date":"2026-04-21","price_cents":17560},{"date":"2026-04-22","price_cents":17600},{"date":"2026-04-23","price_cents":17612},{"date":"2026-04-24","price_cents":17580},{"date":"2026-04-25","price_cents":17612},{"date":"2026-04-26","price_cents":17612}]'::jsonb),
  ('AMZN',  'Amazon.com, Inc.',                    'US Equity',     'Operates the world''s largest online marketplace, Prime memberships, advertising network, and AWS cloud — currently the largest cloud-services provider globally.',           19410, 19410, 20120, 14820,  46.21, 198000000000000, 0.00,
    NULL),
  ('NVDA',  'NVIDIA Corporation',                  'US Equity',     'Designs GPUs, accelerated computing platforms, and AI/HPC chips; CUDA software ecosystem powers most generative-AI training and inference workloads.',                       89512, 89512, 95120, 60140,  68.42, 220000000000000, 0.04,
    NULL),
  ('TSLA',  'Tesla, Inc.',                         'US Equity',     'Designs and manufactures electric vehicles, energy storage, and solar; vertical integration spans batteries, autonomy software, and the global Supercharger network.',     21820, 21820, 28850, 15820,  62.10, 70000000000000, 0.00, NULL),
  ('META',  'Meta Platforms, Inc.',                'US Equity',     'Operates Facebook, Instagram, WhatsApp, and the Reality Labs AR/VR division; ad revenue from social platforms funds AI infrastructure and the metaverse.',               48210, 48210, 53120, 30120,  29.10, 125000000000000, 0.42, NULL),
  ('VTI',   'Vanguard Total Stock Market ETF',     'US Equity',     'Tracks the CRSP US Total Market Index, providing low-cost exposure to nearly all publicly traded US companies. With over $400B in assets and a 0.03% expense ratio, it remains a core holding for diversified long-term portfolios.', 28412, 28412, 29150, 24820,  NULL,  162400000000000, 1.42,
    '[{"date":"2026-04-09","price_cents":27620},{"date":"2026-04-10","price_cents":27741},{"date":"2026-04-11","price_cents":27815},{"date":"2026-04-12","price_cents":27892},{"date":"2026-04-13","price_cents":27980},{"date":"2026-04-14","price_cents":28042},{"date":"2026-04-15","price_cents":28118},{"date":"2026-04-16","price_cents":28204},{"date":"2026-04-17","price_cents":28160},{"date":"2026-04-18","price_cents":28235},{"date":"2026-04-19","price_cents":28298},{"date":"2026-04-20","price_cents":28210},{"date":"2026-04-21","price_cents":28284},{"date":"2026-04-22","price_cents":28321},{"date":"2026-04-23","price_cents":28290},{"date":"2026-04-24","price_cents":28365},{"date":"2026-04-25","price_cents":28392},{"date":"2026-04-26","price_cents":28412}]'::jsonb),
  ('VXUS',  'Vanguard Total Intl Stock ETF',       'Intl Equity',   'Tracks the FTSE Global All Cap ex US Index. Diversified exposure to non-US developed and emerging-market equities at a 0.07% expense ratio.',                              6840,  6840,  7120,  5840,   NULL,  62000000000000, 3.21, NULL),
  ('VWO',   'Vanguard FTSE Emerging Markets ETF',  'Intl Equity',   'Tracks the FTSE Emerging Markets All Cap China A Inclusion Index. Single-fund exposure to large-, mid-, and small-cap emerging-market equities.',                            4521,  4521,  4880,  3920,   NULL,  84000000000000, 2.81, NULL),
  ('BND',   'Vanguard Total Bond Market ETF',      'Fixed Income',  'Tracks the Bloomberg US Aggregate Float Adjusted Index. Investment-grade taxable bonds at a 0.03% expense ratio.',                                                          7521,  7521,  7780,  6920,   NULL,  118000000000000, 4.18, NULL),
  ('TIP',   'iShares TIPS Bond ETF',               'Fixed Income',  'Tracks the Bloomberg US Treasury Inflation Protected Securities (TIPS) Index. Provides inflation-linked income.',                                                          10421, 10421, 10820,  9810,   NULL,  22000000000000, 4.62, NULL),
  ('SCHD',  'Schwab US Dividend Equity ETF',       'US Equity',     'Tracks the Dow Jones US Dividend 100 Index. Concentrated exposure to high-quality, dividend-paying US equities.',                                                          8918, 8918,  9120,  7820,   NULL,  60000000000000, 3.42, NULL),
  ('VNQ',   'Vanguard Real Estate ETF',            'Real Estate',   'Tracks the MSCI US Investable Market Real Estate 25/50 Index. Diversified exposure to publicly-traded REITs.',                                                              9842, 9842, 10220,  8120,   NULL,  60000000000000, 4.81, NULL),
  ('IAU',   'iShares Gold Trust',                  'Commodities',   'Holds physical gold bullion in vaults around the world; targets a 1:1 backing ratio against AUM.',                                                                          4521, 4521, 4820,  3820,   NULL,  35000000000000, 0.00, NULL),
  ('VXF',   'Vanguard Extended Market ETF',        'US Equity',     'Tracks the S&P Completion Index — small- and mid-cap US stocks not in the S&P 500.',                                                                                       18421, 18421, 19120, 14820,  NULL,  20000000000000, 1.18, NULL),
  ('VOO',   'Vanguard S&P 500 ETF',                'US Equity',     'Tracks the S&P 500 Index. The largest 500 publicly traded US companies at a 0.03% expense ratio.',                                                                         48210, 48210, 49120, 38520,  NULL, 460000000000000, 1.31, NULL),
  ('QQQ',   'Invesco QQQ Trust',                   'US Equity',     'Tracks the Nasdaq-100 Index — 100 of the largest non-financial companies listed on the Nasdaq Stock Market.',                                                              42150, 42150, 44120, 30120,  NULL, 248000000000000, 0.62, NULL),
  ('IWM',   'iShares Russell 2000 ETF',            'US Equity',     'Tracks the Russell 2000 Index — small-cap US stocks. Often used as a benchmark for the broader US small-cap market.',                                                       21810, 21810, 23120, 17820,  NULL,  62000000000000, 1.42, NULL),
  ('GLD',   'SPDR Gold Shares',                    'Commodities',   'Holds physical gold; the largest physically-backed gold ETF by AUM.',                                                                                                       22120, 22120, 23120, 18420,  NULL,  85000000000000, 0.00, NULL),
  ('TLT',   'iShares 20+ Year Treasury Bond ETF',  'Fixed Income',  'Tracks the ICE US Treasury 20+ Year Bond Index — long-duration US Treasury bonds.',                                                                                          9420,  9420,  9920,  8120,   NULL,  18000000000000, 4.42, NULL),
  ('IEF',   'iShares 7-10 Year Treasury Bond ETF', 'Fixed Income',  'Tracks the ICE US Treasury 7-10 Year Bond Index — intermediate-duration US Treasury bonds.',                                                                                 9620, 9620, 9820, 8920,   NULL,  16000000000000, 3.92, NULL),
  ('JPM',   'JPMorgan Chase & Co.',                'US Equity',     'Largest US bank by assets; consumer banking, investment banking, asset management, and treasury services for global enterprises.',                                          21340, 21340, 22120, 16820,  12.10, 65000000000000, 2.42, NULL),
  ('JNJ',   'Johnson & Johnson',                   'US Equity',     'Pharmaceuticals, MedTech devices, and consumer health products; defensive holding with a long history of dividend growth.',                                                 16210, 16210, 16920, 14210,  16.42, 39000000000000, 3.18, NULL),
  ('BRK-B', 'Berkshire Hathaway Inc. Class B',     'US Equity',     'Conglomerate holding insurance (GEICO), railroads (BNSF), utilities (BHE), and equity stakes (Apple, Coca-Cola). Run by Warren Buffett & Greg Abel.',                       42120, 42120, 44120, 36120,   9.21, 91000000000000, 0.00, NULL),
  ('UNH',   'UnitedHealth Group Inc.',             'US Equity',     'Largest US health-care insurer (UnitedHealthcare) plus Optum services arm; serves both commercial and Medicare/Medicaid populations.',                                      54120, 54120, 56120, 44210,  17.42, 50000000000000, 1.62, NULL),
  ('XOM',   'Exxon Mobil Corporation',             'US Equity',     'Integrated energy major: upstream production, downstream refining, and petrochemicals. Long-term capex focused on Permian Basin and Guyana.',                                12010, 12010, 13120,  9810,  10.92, 50000000000000, 3.42, NULL)
ON CONFLICT (symbol) DO NOTHING;

-- ----- news_articles: seed a public news feed -----------------------

INSERT INTO public.news_articles
  (id, title, source, summary, content, url, symbol, related_symbols, published_at)
VALUES
  (gen_random_uuid(), 'Apple reports record Q1 services revenue, iPhone shipments steady',
    'Bloomberg', 'Services revenue rose 18% YoY while iPhone unit sales held flat — analysts see margin expansion as the key bullish driver.',
    'Apple Inc. reported its highest-ever quarterly services revenue this morning, with subscription growth across the App Store, Apple Music, iCloud, and AppleCare segments outpacing Wall Street estimates. CEO Tim Cook noted on the earnings call that Apple now has 1.2 billion paid subscriptions across its services portfolio. iPhone shipments came in essentially flat year-over-year, but average selling price ticked up due to a higher mix of Pro models. Analyst consensus is shifting toward viewing Apple as a services-margin story rather than a hardware-cycle story.',
    'https://example.com/news/aapl-q1-services',
    'AAPL', '["AAPL"]'::jsonb,
    now() - interval '2 hours'),
  (gen_random_uuid(), 'NVIDIA unveils next-gen GPU architecture aimed at AI inference',
    'Reuters', 'New Blackwell-2 chip family targets sub-millisecond inference latency for trillion-parameter models.',
    'NVIDIA Corp. announced its next-generation GPU architecture this morning, with shipments expected in Q3. The Blackwell-2 family targets datacenter inference workloads specifically, doubling memory bandwidth and supporting native FP4 precision. Major cloud customers including AWS, Azure, and Google Cloud have already committed to orders.',
    'https://example.com/news/nvda-blackwell-2',
    'NVDA', '["NVDA"]'::jsonb,
    now() - interval '5 hours'),
  (gen_random_uuid(), 'Fed minutes signal one more rate cut likely before year-end',
    'CNBC', 'FOMC participants leaned dovish in their dot-plot revisions; bond yields fell 8bps on the release.',
    'Federal Reserve minutes from the September FOMC meeting showed a clear majority of participants anticipate one additional rate cut before year-end, with several arguing for two. Treasury yields fell across the curve following the release, with the 10-year dropping 8 basis points. Equities rallied on the dovish read, with rate-sensitive sectors (REITs, utilities, financials) leading the move.',
    'https://example.com/news/fed-minutes-dovish',
    NULL, '["TLT","IEF","BND","VNQ"]'::jsonb,
    now() - interval '1 day'),
  (gen_random_uuid(), 'Microsoft Azure cloud revenue grows 31% YoY, beats expectations',
    'WSJ', 'AI-related workloads now make up 14% of Azure consumption, up from 7% a year ago.',
    'Microsoft Corp. reported Q1 results after the close, with Azure cloud revenue growing 31% year-over-year. CFO Amy Hood noted on the call that AI-related workloads now make up 14% of total Azure consumption, more than doubling from 7% in the prior-year period. The company raised its full-year capex guidance to $80B+ to fund AI infrastructure.',
    'https://example.com/news/msft-azure-q1',
    'MSFT', '["MSFT"]'::jsonb,
    now() - interval '8 hours'),
  (gen_random_uuid(), 'Tesla Q3 deliveries miss estimates; Cybertruck production ramp slower than expected',
    'Reuters', 'Q3 deliveries came in at 462k units vs 475k expected; CEO cites supply-chain delays for cell production.',
    'Tesla, Inc. delivered 462,000 vehicles in Q3, falling short of analyst estimates of 475,000. CEO Elon Musk attributed the miss to slower-than-expected ramp of Cybertruck production at Giga Texas, citing supply-chain delays for the new 4680 battery cells. Despite the miss, automotive gross margins improved 120bps QoQ on cost reductions in the Model Y line.',
    'https://example.com/news/tsla-q3-deliveries',
    'TSLA', '["TSLA"]'::jsonb,
    now() - interval '3 hours'),
  (gen_random_uuid(), 'S&P 500 hits new all-time high on Fed rate-cut expectations',
    'Financial Times', 'Index closed at 5,842 — the eleventh new high this year — led by tech and consumer-discretionary sectors.',
    'The S&P 500 closed at a new all-time high of 5,842, up 1.2% for the day. Tech and consumer-discretionary sectors led the rally, with NVIDIA, Amazon, and Tesla all up over 2%. Bond yields fell 6bps on the rate-cut speculation, supporting equity multiples.',
    'https://example.com/news/spy-new-high',
    NULL, '["VOO","QQQ","VTI"]'::jsonb,
    now() - interval '12 hours'),
  (gen_random_uuid(), 'Vanguard cuts expense ratio on VTI and VXUS by 1bp',
    'Bloomberg', 'VTI now charges 0.02% — the cheapest total-market ETF on the market.',
    'Vanguard Group Inc. announced a 1-basis-point expense ratio cut on its flagship VTI Total Stock Market ETF and VXUS International ETF, effective next quarter. VTI now charges 0.02%, making it the cheapest total-market ETF on the market. Industry analysts expect competitors (Schwab, BlackRock) to follow suit within the next 60 days.',
    'https://example.com/news/vanguard-fee-cut',
    'VTI', '["VTI","VXUS"]'::jsonb,
    now() - interval '2 days'),
  (gen_random_uuid(), 'Gold prices break $2,500/oz on safe-haven demand',
    'Bloomberg', 'Spot gold up 1.4% intraday on Middle East tensions; GLD and IAU both at multi-year highs.',
    'Spot gold prices broke above $2,500 per troy ounce for the first time, ending the session at $2,524. The move was driven by safe-haven demand on escalating Middle East tensions and continued central-bank buying in emerging markets. Gold-backed ETFs GLD and IAU both hit multi-year highs, with combined AUM rising $4B over the past two weeks.',
    'https://example.com/news/gold-2500',
    'GLD', '["GLD","IAU"]'::jsonb,
    now() - interval '6 hours'),
  (gen_random_uuid(), 'Berkshire Hathaway trims Apple stake by 25% in Q3',
    'CNBC', 'BRK reduced its AAPL holdings to ~$84B in Q3, the largest single trim in over a decade.',
    'Berkshire Hathaway Inc. trimmed its Apple position by approximately 25% in Q3, according to its 13F filing released this morning. The remaining stake is valued at roughly $84B, down from $110B at the end of Q2. Warren Buffett told shareholders earlier this year that the sale was for tax-management reasons, not a thesis change.',
    'https://example.com/news/brk-aapl-trim',
    'BRK-B', '["BRK-B","AAPL"]'::jsonb,
    now() - interval '4 days'),
  (gen_random_uuid(), 'JPMorgan tops Q3 earnings expectations on net interest income',
    'WSJ', 'NII rose 9% YoY, beating estimates; investment banking fees up 24% on M&A rebound.',
    'JPMorgan Chase & Co. reported Q3 earnings of $5.07/share, beating analyst estimates of $4.81. Net interest income rose 9% year-over-year on continued strength in commercial banking. Investment banking fees rose 24%, reflecting an M&A rebound across multiple sectors.',
    'https://example.com/news/jpm-q3-earnings',
    'JPM', '["JPM"]'::jsonb,
    now() - interval '3 days')
ON CONFLICT DO NOTHING;
