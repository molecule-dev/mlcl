-- Seed a small but real verified foods database so the food search has
-- meaningful results out of the box. The values here are typical
-- per-serving USDA nutrition data — protein/carbs/fat/fiber/sodium/sugar
-- are in grams (sodium in mg). `is_verified=true, is_custom=false` marks
-- them as system-wide rows that every authenticated user can search.
--
-- Idempotent insert: gated on a `barcode` lookup so re-running the
-- migration (or applying it on top of a pre-existing DB) does not
-- duplicate rows.

INSERT INTO public.foods
  (id, user_id, name, brand, category, barcode, calories, protein, carbs, fat, fiber, sodium, sugar, serving_size, serving_unit, is_verified, is_custom)
SELECT * FROM (VALUES
  (gen_random_uuid(), NULL::uuid, 'Apple', 'USDA', 'fruit', 'cc-apple', 95.0, 0.5, 25.0, 0.3, 4.4, 2.0, 19.0, 1.0, 'medium (182g)', true, false),
  (gen_random_uuid(), NULL::uuid, 'Banana', 'USDA', 'fruit', 'cc-banana', 105.0, 1.3, 27.0, 0.4, 3.1, 1.0, 14.0, 1.0, 'medium (118g)', true, false),
  (gen_random_uuid(), NULL::uuid, 'Strawberries', 'USDA', 'fruit', 'cc-strawberries', 49.0, 1.0, 12.0, 0.5, 3.0, 1.0, 7.0, 1.0, 'cup (152g)', true, false),
  (gen_random_uuid(), NULL::uuid, 'Blueberries', 'USDA', 'fruit', 'cc-blueberries', 84.0, 1.1, 21.0, 0.5, 3.6, 1.0, 15.0, 1.0, 'cup (148g)', true, false),
  (gen_random_uuid(), NULL::uuid, 'Orange', 'USDA', 'fruit', 'cc-orange', 62.0, 1.2, 15.0, 0.2, 3.1, 0.0, 12.0, 1.0, 'medium (131g)', true, false),
  (gen_random_uuid(), NULL::uuid, 'Avocado', 'USDA', 'fruit', 'cc-avocado', 234.0, 2.9, 12.0, 21.0, 9.8, 11.0, 0.7, 1.0, 'fruit (150g)', true, false),
  (gen_random_uuid(), NULL::uuid, 'Broccoli', 'USDA', 'vegetable', 'cc-broccoli', 55.0, 3.7, 11.0, 0.6, 5.1, 64.0, 2.6, 1.0, 'cup chopped (91g)', true, false),
  (gen_random_uuid(), NULL::uuid, 'Spinach', 'USDA', 'vegetable', 'cc-spinach', 7.0, 0.9, 1.1, 0.1, 0.7, 24.0, 0.1, 1.0, 'cup raw (30g)', true, false),
  (gen_random_uuid(), NULL::uuid, 'Carrot', 'USDA', 'vegetable', 'cc-carrot', 25.0, 0.6, 6.0, 0.1, 1.7, 42.0, 2.9, 1.0, 'medium (61g)', true, false),
  (gen_random_uuid(), NULL::uuid, 'Sweet Potato', 'USDA', 'vegetable', 'cc-sweet-potato', 112.0, 2.0, 26.0, 0.1, 3.9, 71.0, 5.4, 1.0, 'medium (130g)', true, false),
  (gen_random_uuid(), NULL::uuid, 'Chicken Breast', 'USDA', 'meat', 'cc-chicken-breast', 165.0, 31.0, 0.0, 3.6, 0.0, 74.0, 0.0, 1.0, '100g cooked', true, false),
  (gen_random_uuid(), NULL::uuid, 'Salmon', 'USDA', 'fish', 'cc-salmon', 208.0, 20.0, 0.0, 13.0, 0.0, 59.0, 0.0, 1.0, '100g cooked', true, false),
  (gen_random_uuid(), NULL::uuid, 'Eggs', 'USDA', 'dairy', 'cc-egg', 72.0, 6.3, 0.4, 5.0, 0.0, 71.0, 0.4, 1.0, 'large egg (50g)', true, false),
  (gen_random_uuid(), NULL::uuid, 'Greek Yogurt', 'USDA', 'dairy', 'cc-greek-yogurt', 100.0, 17.0, 6.0, 0.7, 0.0, 60.0, 6.0, 1.0, 'cup (170g)', true, false),
  (gen_random_uuid(), NULL::uuid, 'Whole Milk', 'USDA', 'dairy', 'cc-whole-milk', 149.0, 8.0, 12.0, 8.0, 0.0, 105.0, 12.0, 1.0, 'cup (244g)', true, false),
  (gen_random_uuid(), NULL::uuid, 'Almond Milk', 'USDA', 'beverage', 'cc-almond-milk', 39.0, 1.0, 1.5, 2.5, 1.0, 186.0, 0.0, 1.0, 'cup (240ml)', true, false),
  (gen_random_uuid(), NULL::uuid, 'Cheddar Cheese', 'USDA', 'dairy', 'cc-cheddar', 113.0, 7.0, 0.4, 9.0, 0.0, 174.0, 0.1, 1.0, 'oz (28g)', true, false),
  (gen_random_uuid(), NULL::uuid, 'Brown Rice', 'USDA', 'grain', 'cc-brown-rice', 216.0, 5.0, 45.0, 1.8, 3.5, 10.0, 0.7, 1.0, 'cup cooked (195g)', true, false),
  (gen_random_uuid(), NULL::uuid, 'White Rice', 'USDA', 'grain', 'cc-white-rice', 205.0, 4.3, 45.0, 0.4, 0.6, 2.0, 0.1, 1.0, 'cup cooked (158g)', true, false),
  (gen_random_uuid(), NULL::uuid, 'Quinoa', 'USDA', 'grain', 'cc-quinoa', 222.0, 8.0, 39.0, 4.0, 5.0, 13.0, 1.6, 1.0, 'cup cooked (185g)', true, false),
  (gen_random_uuid(), NULL::uuid, 'Oatmeal', 'USDA', 'grain', 'cc-oatmeal', 158.0, 6.0, 27.0, 3.0, 4.0, 115.0, 1.1, 1.0, 'cup cooked (234g)', true, false),
  (gen_random_uuid(), NULL::uuid, 'Whole Wheat Bread', 'USDA', 'grain', 'cc-whole-wheat-bread', 81.0, 4.0, 14.0, 1.1, 1.9, 144.0, 1.4, 1.0, 'slice (32g)', true, false),
  (gen_random_uuid(), NULL::uuid, 'Pasta', 'USDA', 'grain', 'cc-pasta', 220.0, 8.0, 43.0, 1.3, 2.5, 1.0, 0.8, 1.0, 'cup cooked (140g)', true, false),
  (gen_random_uuid(), NULL::uuid, 'Almonds', 'USDA', 'nuts', 'cc-almonds', 164.0, 6.0, 6.0, 14.0, 3.5, 0.0, 1.2, 1.0, 'oz (28g)', true, false),
  (gen_random_uuid(), NULL::uuid, 'Peanut Butter', 'USDA', 'nuts', 'cc-peanut-butter', 188.0, 8.0, 6.0, 16.0, 1.6, 152.0, 3.0, 1.0, '2 tbsp (32g)', true, false),
  (gen_random_uuid(), NULL::uuid, 'Black Beans', 'USDA', 'legume', 'cc-black-beans', 227.0, 15.0, 41.0, 0.9, 15.0, 2.0, 0.6, 1.0, 'cup cooked (172g)', true, false),
  (gen_random_uuid(), NULL::uuid, 'Lentils', 'USDA', 'legume', 'cc-lentils', 230.0, 18.0, 40.0, 0.8, 16.0, 4.0, 3.6, 1.0, 'cup cooked (198g)', true, false),
  (gen_random_uuid(), NULL::uuid, 'Tofu', 'USDA', 'protein', 'cc-tofu', 144.0, 17.0, 3.5, 8.7, 2.3, 14.0, 0.6, 1.0, 'cup (124g)', true, false),
  (gen_random_uuid(), NULL::uuid, 'Olive Oil', 'USDA', 'fat', 'cc-olive-oil', 119.0, 0.0, 0.0, 13.5, 0.0, 0.0, 0.0, 1.0, 'tbsp (14g)', true, false),
  (gen_random_uuid(), NULL::uuid, 'Butter', 'USDA', 'fat', 'cc-butter', 102.0, 0.1, 0.0, 11.5, 0.0, 91.0, 0.0, 1.0, 'tbsp (14g)', true, false),
  (gen_random_uuid(), NULL::uuid, 'Coffee', 'USDA', 'beverage', 'cc-coffee', 2.0, 0.3, 0.0, 0.0, 0.0, 5.0, 0.0, 1.0, 'cup (240ml)', true, false),
  (gen_random_uuid(), NULL::uuid, 'Green Tea', 'USDA', 'beverage', 'cc-green-tea', 0.0, 0.0, 0.0, 0.0, 0.0, 2.0, 0.0, 1.0, 'cup (245ml)', true, false),
  (gen_random_uuid(), NULL::uuid, 'Orange Juice', 'USDA', 'beverage', 'cc-orange-juice', 112.0, 1.7, 26.0, 0.5, 0.5, 2.0, 21.0, 1.0, 'cup (248g)', true, false),
  (gen_random_uuid(), NULL::uuid, 'Cola', 'Generic', 'beverage', 'cc-cola', 140.0, 0.0, 39.0, 0.0, 0.0, 45.0, 39.0, 1.0, 'can (355ml)', true, false),
  (gen_random_uuid(), NULL::uuid, 'Water', 'Generic', 'beverage', 'cc-water', 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 'cup (240ml)', true, false),
  (gen_random_uuid(), NULL::uuid, 'Banana Bread', 'Cafe', 'baked', 'cc-banana-bread', 196.0, 2.6, 33.0, 6.3, 0.7, 181.0, 14.0, 1.0, 'slice (60g)', true, false),
  (gen_random_uuid(), NULL::uuid, 'Bagel', 'Generic', 'baked', 'cc-bagel', 245.0, 9.0, 48.0, 1.5, 2.1, 430.0, 6.0, 1.0, 'plain (95g)', true, false),
  (gen_random_uuid(), NULL::uuid, 'Pizza Slice', 'Generic', 'meal', 'cc-pizza-slice', 285.0, 12.0, 36.0, 10.0, 2.0, 640.0, 4.0, 1.0, 'slice (107g)', true, false),
  (gen_random_uuid(), NULL::uuid, 'Caesar Salad', 'Restaurant', 'meal', 'cc-caesar-salad', 470.0, 12.0, 22.0, 38.0, 4.0, 950.0, 3.0, 1.0, 'plate (300g)', true, false),
  (gen_random_uuid(), NULL::uuid, 'Cheeseburger', 'Restaurant', 'meal', 'cc-cheeseburger', 535.0, 25.0, 38.0, 30.0, 2.0, 1090.0, 8.0, 1.0, 'burger (200g)', true, false)
) AS new_foods(id, user_id, name, brand, category, barcode, calories, protein, carbs, fat, fiber, sodium, sugar, serving_size, serving_unit, is_verified, is_custom)
WHERE NOT EXISTS (
  SELECT 1 FROM public.foods WHERE foods.barcode = new_foods.barcode
);
