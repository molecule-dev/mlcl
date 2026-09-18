#!/usr/bin/env bash
# Seed a small `qadmin_demo` postgres database for the e2e suite.
#
# The Quarry e2e suite (e2e/*.spec.ts) connects to a REAL postgres
# instance to exercise schema introspection, query execution, and table
# browsing. This script provisions that instance with two seeded tables
# (`products`, `orders`) plus an index and a FK so the schema/index/FK
# tabs have something to render.
#
# Defaults assume the molecule docker-compose postgres at host=localhost
# port=5432 user=molecule password=molecule, which is what `mlcl create`
# wires up. Override DEMO_HOST / DEMO_PORT / DEMO_USER / DEMO_PASSWORD /
# DEMO_DB to point at any other postgres.
#
# Usage:
#   ./scripts/setup-demo-db.sh           # seed qadmin_demo on localhost
#   DEMO_DB=other ./scripts/setup-demo-db.sh

set -euo pipefail

DEMO_HOST="${DEMO_HOST:-localhost}"
DEMO_PORT="${DEMO_PORT:-5432}"
DEMO_USER="${DEMO_USER:-molecule}"
DEMO_PASSWORD="${DEMO_PASSWORD:-molecule}"
DEMO_DB="${DEMO_DB:-qadmin_demo}"

# Pick whichever psql we can find — local install or the docker container
# that ships with the molecule dev compose stack.
DOCKER_CONTAINER="${DOCKER_CONTAINER:-molecule-dev-db-1}"
have_local_psql() { command -v psql >/dev/null 2>&1; }
have_docker_psql() {
  command -v docker >/dev/null 2>&1 \
    && docker ps --format '{{.Names}}' | grep -q "^${DOCKER_CONTAINER}$"
}

run_psql() {
  if have_local_psql; then
    PGPASSWORD="$DEMO_PASSWORD" psql -h "$DEMO_HOST" -p "$DEMO_PORT" \
      -U "$DEMO_USER" -d "$1" -v ON_ERROR_STOP=1 -c "$2"
  elif have_docker_psql; then
    docker exec -e PGPASSWORD="$DEMO_PASSWORD" "$DOCKER_CONTAINER" \
      psql -U "$DEMO_USER" -d "$1" -v ON_ERROR_STOP=1 -c "$2"
  else
    echo "ERR: neither local psql nor docker container '$DOCKER_CONTAINER' available" >&2
    exit 1
  fi
}

run_psql_stdin() {
  if have_local_psql; then
    PGPASSWORD="$DEMO_PASSWORD" psql -h "$DEMO_HOST" -p "$DEMO_PORT" \
      -U "$DEMO_USER" -d "$1" -v ON_ERROR_STOP=1
  elif have_docker_psql; then
    docker exec -i -e PGPASSWORD="$DEMO_PASSWORD" "$DOCKER_CONTAINER" \
      psql -U "$DEMO_USER" -d "$1" -v ON_ERROR_STOP=1
  else
    echo "ERR: neither local psql nor docker container '$DOCKER_CONTAINER' available" >&2
    exit 1
  fi
}

echo "→ ensuring database '$DEMO_DB' exists on $DEMO_HOST:$DEMO_PORT"
run_psql postgres "SELECT 1" >/dev/null
run_psql postgres "CREATE DATABASE \"$DEMO_DB\"" 2>/dev/null \
  || echo "  (already exists, reusing)"

echo "→ seeding tables, indexes, fk, and sample rows"
run_psql_stdin "$DEMO_DB" <<'SQL'
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS products CASCADE;

CREATE TABLE products (
  id          serial PRIMARY KEY,
  sku         text UNIQUE NOT NULL,
  name        text NOT NULL,
  price_cents integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_sku ON products (sku);

CREATE TABLE orders (
  id         serial PRIMARY KEY,
  product_id integer REFERENCES products(id),
  quantity   integer NOT NULL DEFAULT 1,
  status     text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO products (sku, name, price_cents) VALUES
  ('SKU-001', 'Espresso Beans 1lb',   1499),
  ('SKU-002', 'French Press 8-cup',   3299),
  ('SKU-003', 'Burr Grinder',         8999),
  ('SKU-004', 'Pour-over Kettle',     5499),
  ('SKU-005', 'Cold Brew Maker',      4299);

INSERT INTO orders (product_id, quantity, status) VALUES
  (1, 2, 'fulfilled'),
  (1, 1, 'pending'),
  (2, 1, 'fulfilled'),
  (3, 1, 'pending'),
  (3, 1, 'fulfilled'),
  (4, 3, 'fulfilled'),
  (5, 2, 'pending'),
  (5, 1, 'cancelled');
SQL

echo "✓ '$DEMO_DB' ready: 5 products, 8 orders, 1 secondary index, 1 FK"
