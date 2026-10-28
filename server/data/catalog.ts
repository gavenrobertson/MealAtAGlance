import type { Category } from '../../shared/types';
import { canonicalName } from '../../shared/units';

/**
 * Demo grocery catalog with realistic (late-2020s US big-box) shelf prices.
 * Tiers: s = store brand (gets the provider's house brand prefixed), n = national brand (label has brand),
 * o = organic store brand, p = loose produce / no brand. `w` marks sold-by-weight (price is per size).
 */
type Tier = 's' | 'n' | 'o' | 'p';
export type CatalogVariant = [label: string, size: string, price: number, tier: Tier, soldByWeight?: 'w'];

export interface CatalogEntry {
  key: string;
  emoji: string;
  category: Category;
  variants: CatalogVariant[];
  aliases?: string[];
}

const e = (key: string, emoji: string, category: Category, variants: CatalogVariant[], aliases: string[] = []): CatalogEntry =>
  ({ key, emoji, category, variants, aliases });

export const CATALOG: CatalogEntry[] = [
  // Produce
  e('yellow onion', '🧅', 'produce', [['Yellow Onions, 3 lb Bag', '3 lb', 3.47, 'p'], ['Yellow Onion, each', '1 ct', 0.92, 'p'], ['Organic Yellow Onions', '2 lb', 3.98, 'o']], ['onion', 'white onion']),
  e('red onion', '🧅', 'produce', [['Red Onion, each', '1 ct', 1.12, 'p'], ['Red Onions, 2 lb Bag', '2 lb', 3.27, 'p']]),
  e('green onion', '🌱', 'produce', [['Green Onions, bunch', '1 bunch', 0.78, 'p'], ['Organic Green Onions', '1 bunch', 1.28, 'o']], ['scallion']),
  e('garlic', '🧄', 'produce', [['Garlic, 3 ct Sleeve', '3 ct', 1.47, 'p'], ['Whole Garlic Bulb, each', '1 ct', 0.62, 'p'], ['Minced Garlic Jar', '8 oz', 2.48, 's']]),
  e('ginger', '🫚', 'produce', [['Fresh Ginger Root, per lb', '1 lb', 3.48, 'p', 'w'], ['Ginger Paste Tube', '4 oz', 3.12, 'n']]),
  e('tomato', '🍅', 'produce', [['Tomatoes on the Vine, per lb', '1 lb', 1.98, 'p', 'w'], ['Roma Tomatoes, per lb', '1 lb', 1.27, 'p', 'w']]),
  e('cherry tomato', '🍅', 'produce', [['Cherry Tomatoes', '10 oz', 2.48, 's'], ['Grape Tomatoes', '1 pint', 2.97, 'p'], ['Organic Cherry Tomatoes', '10 oz', 3.97, 'o']], ['grape tomato']),
  e('potato', '🥔', 'produce', [['Russet Potatoes, 5 lb Bag', '5 lb', 3.97, 'p'], ['Baby Gold Potatoes', '1.5 lb', 3.48, 's'], ['Red Potatoes, 3 lb', '3 lb', 3.74, 'p']]),
  e('sweet potato', '🍠', 'produce', [['Sweet Potatoes, per lb', '1 lb', 1.12, 'p', 'w'], ['Sweet Potatoes, 3 lb Bag', '3 lb', 3.24, 'p']]),
  e('carrot', '🥕', 'produce', [['Carrots, 2 lb Bag', '2 lb', 1.97, 'p'], ['Baby Carrots', '1 lb', 1.27, 's'], ['Organic Carrots', '2 lb', 2.68, 'o']]),
  e('celery', '🥬', 'produce', [['Celery Hearts', '1 bunch', 2.48, 'p'], ['Celery Stalk, each', '1 bunch', 1.68, 'p']]),
  e('bell pepper', '🫑', 'produce', [['Green Bell Pepper, each', '1 ct', 0.78, 'p'], ['Red Bell Pepper, each', '1 ct', 1.47, 'p'], ['Tri-Color Bell Peppers, 3 ct', '3 ct', 3.97, 'p']], ['red bell pepper', 'green bell pepper']),
  e('zucchini', '🥒', 'produce', [['Zucchini Squash, per lb', '1 lb', 1.62, 'p', 'w'], ['Organic Zucchini', '1 ct', 1.48, 'o']]),
  e('cucumber', '🥒', 'produce', [['Cucumber, each', '1 ct', 0.72, 'p'], ['English Cucumber, each', '1 ct', 1.48, 'p']]),
  e('avocado', '🥑', 'produce', [['Hass Avocado, each', '1 ct', 0.98, 'p'], ['Hass Avocados, 4 ct Bag', '4 ct', 3.98, 'p'], ['Organic Hass Avocados, 4 ct', '4 ct', 5.47, 'o']]),
  e('banana', '🍌', 'produce', [['Bananas, each', '1 ct', 0.27, 'p'], ['Organic Bananas, bunch', '6 ct', 2.18, 'o']]),
  e('apple', '🍎', 'produce', [['Gala Apples, 3 lb Bag', '3 lb', 4.47, 'p'], ['Honeycrisp Apple, each', '1 ct', 1.62, 'p']]),
  e('lemon', '🍋', 'produce', [['Lemon, each', '1 ct', 0.58, 'p'], ['Lemons, 2 lb Bag', '2 lb', 3.97, 'p']]),
  e('lime', '🍋‍🟩', 'produce', [['Lime, each', '1 ct', 0.34, 'p'], ['Limes, 2 lb Bag', '2 lb', 2.97, 'p']]),
  e('clementine', '🍊', 'produce', [['Clementines, 3 lb Bag', '3 lb', 4.98, 'p'], ['Cuties Mandarins, 2 lb', '2 lb', 4.48, 'n']]),
  e('blueberry', '🫐', 'produce', [['Fresh Blueberries', '11 oz', 3.48, 'p'], ['Fresh Blueberries', '18 oz', 4.97, 'p'], ['Organic Blueberries', '6 oz', 3.98, 'o']], ['blueberries']),
  e('strawberry', '🍓', 'produce', [['Fresh Strawberries', '1 lb', 2.97, 'p'], ['Organic Strawberries', '1 lb', 4.47, 'o']]),
  e('pineapple chunk', '🍍', 'produce', [['Fresh Pineapple Chunks', '16 oz', 3.98, 'p'], ['Dole Pineapple Chunks in Juice', '20 oz', 2.18, 'n']], ['pineapple']),
  e('broccoli', '🥦', 'produce', [['Broccoli Crowns, per lb', '1 lb', 1.98, 'p', 'w'], ['Broccoli Florets', '12 oz', 2.67, 's'], ['Organic Broccoli', '1 lb', 3.24, 'o']]),
  e('asparagus', '🌿', 'produce', [['Fresh Asparagus Bunch', '1 lb', 2.98, 'p'], ['Organic Asparagus', '1 lb', 4.48, 'o']]),
  e('green bean', '🫛', 'produce', [['Fresh Green Beans', '12 oz', 2.48, 's'], ['Fresh Green Beans, per lb', '1 lb', 1.98, 'p', 'w']], ['green beans']),
  e('romaine lettuce', '🥬', 'produce', [['Romaine Hearts, 3 ct', '3 ct', 3.28, 'p'], ['Romaine Lettuce, head', '1 head', 1.78, 'p']], ['romaine', 'lettuce']),
  e('spinach', '🥬', 'produce', [['Baby Spinach', '10 oz', 2.98, 's'], ['Baby Spinach', '5 oz', 1.98, 's'], ['Organic Baby Spinach', '16 oz', 4.98, 'o']], ['baby spinach']),
  e('kale', '🥬', 'produce', [['Kale, bunch', '1 bunch', 1.47, 'p'], ['Chopped Kale', '10 oz', 2.48, 's']]),
  e('mixed greens', '🥗', 'produce', [['Spring Mix Salad', '5 oz', 2.98, 's'], ['Organic Spring Mix', '11 oz', 4.98, 'o']], ['spring mix', 'salad greens']),
  e('parsley', '🌿', 'produce', [['Italian Parsley, bunch', '1 bunch', 0.88, 'p']]),
  e('cilantro', '🌿', 'produce', [['Cilantro, bunch', '1 bunch', 0.68, 'p']]),
  e('basil', '🌿', 'produce', [['Fresh Basil', '0.75 oz', 2.18, 'p']]),
  e('mushroom', '🍄', 'produce', [['White Mushrooms', '8 oz', 1.98, 's'], ['Baby Bella Mushrooms', '8 oz', 2.38, 's']]),
  e('jalapeno', '🌶️', 'produce', [['Jalapeño Pepper, each', '1 ct', 0.18, 'p']]),
  e('cauliflower', '🥦', 'produce', [['Cauliflower, head', '1 head', 2.98, 'p']]),

  // Meat & seafood
  e('chicken breast', '🍗', 'meat', [['Boneless Skinless Chicken Breasts', '2.5 lb', 9.97, 's'], ['Boneless Skinless Chicken Breasts', '1 lb', 4.47, 's'], ['Tyson All Natural Chicken Breasts', '2.5 lb', 12.48, 'n'], ['Organic Chicken Breasts', '1 lb', 8.47, 'o']], ['chicken']),
  e('chicken thigh', '🍗', 'meat', [['Boneless Skinless Chicken Thighs', '2.5 lb', 8.97, 's'], ['Perdue Chicken Thighs', '1.5 lb', 6.48, 'n']]),
  e('ground chicken', '🍗', 'meat', [['Ground Chicken', '1 lb', 4.48, 's'], ['Perdue Ground Chicken', '1 lb', 5.47, 'n']]),
  e('ground turkey', '🦃', 'meat', [['93% Lean Ground Turkey', '1 lb', 4.97, 's'], ['Jennie-O Lean Ground Turkey', '1 lb', 5.98, 'n'], ['Organic Ground Turkey', '1 lb', 7.48, 'o']]),
  e('ground beef', '🥩', 'meat', [['90% Lean Ground Beef', '1 lb', 6.48, 's'], ['80% Lean Ground Beef', '2 lb', 10.97, 's'], ['Grass-Fed Ground Beef', '1 lb', 8.47, 'o']]),
  e('flank steak', '🥩', 'meat', [['Beef Flank Steak, per lb', '1 lb', 10.98, 'p', 'w'], ['Beef Sirloin Steak, per lb', '1 lb', 8.97, 'p', 'w']]),
  e('pork tenderloin', '🐖', 'meat', [['Pork Tenderloin', '1.5 lb', 6.94, 's'], ['Smithfield Marinated Pork Tenderloin', '1.4 lb', 8.48, 'n']]),
  e('deli turkey', '🦃', 'meat', [['Oven Roasted Turkey Breast, Deli Sliced', '9 oz', 3.48, 's'], ['Hillshire Farm Ultra Thin Turkey', '16 oz', 7.98, 'n']], ['turkey breast deli']),
  e('salmon fillet', '🐟', 'seafood', [['Fresh Atlantic Salmon Fillet, per lb', '1 lb', 9.47, 'p', 'w'], ['Frozen Atlantic Salmon Fillets', '2 lb', 15.97, 's']], ['salmon']),
  e('cod', '🐟', 'seafood', [['Frozen Wild Cod Fillets', '1 lb', 7.48, 's'], ['Fresh Cod Fillet, per lb', '1 lb', 10.98, 'p', 'w']]),
  e('shrimp', '🦐', 'seafood', [['Frozen Raw Peeled Shrimp, 31-40 ct', '2 lb', 13.97, 's'], ['Frozen Cooked Shrimp', '1 lb', 7.97, 's']]),
  e('tuna', '🐟', 'canned', [['Chunk Light Tuna in Water', '5 oz', 0.98, 's'], ['StarKist Chunk Light Tuna, 4 pk', '4 x 5 oz', 5.24, 'n']], ['canned tuna']),

  // Dairy & eggs
  e('egg', '🥚', 'eggs', [['Large White Eggs, 12 ct', '12 ct', 3.24, 's'], ['Large White Eggs, 18 ct', '18 ct', 4.62, 's'], ['Organic Brown Eggs, 12 ct', '12 ct', 5.97, 'o']], ['eggs']),
  e('milk', '🥛', 'dairy', [['2% Reduced Fat Milk, 1 Gallon', '1 gal', 3.38, 's'], ['Whole Milk, Half Gallon', '0.5 gal', 2.12, 's'], ['Organic 2% Milk, Half Gallon', '0.5 gal', 4.98, 'o']], ['whole milk', '2% milk']),
  e('almond milk', '🥛', 'dairy', [['Unsweetened Almond Milk', '64 fl oz', 2.67, 's'], ['Silk Unsweetened Almondmilk', '64 fl oz', 3.68, 'n']]),
  e('greek yogurt', '🥣', 'dairy', [['Plain Nonfat Greek Yogurt', '32 oz', 4.27, 's'], ['Chobani Plain Greek Yogurt', '32 oz', 6.48, 'n'], ['Fage Total 0% Greek Yogurt', '17.6 oz', 4.98, 'n']]),
  e('cottage cheese', '🥣', 'dairy', [['Small Curd Cottage Cheese', '16 oz', 2.47, 's'], ['Good Culture Cottage Cheese', '16 oz', 4.48, 'n']]),
  e('feta cheese', '🧀', 'dairy', [['Crumbled Feta Cheese', '6 oz', 2.98, 's'], ['Athenos Crumbled Feta', '6 oz', 4.18, 'n']], ['feta']),
  e('cheddar cheese', '🧀', 'dairy', [['Shredded Sharp Cheddar', '8 oz', 2.24, 's'], ['Tillamook Shredded Cheddar', '8 oz', 3.98, 'n'], ['Shredded Mild Cheddar', '32 oz', 7.97, 's']], ['shredded cheddar']),
  e('mozzarella cheese', '🧀', 'dairy', [['Shredded Low-Moisture Mozzarella', '8 oz', 2.24, 's'], ['Sargento Shredded Mozzarella', '8 oz', 3.48, 'n']]),
  e('parmesan cheese', '🧀', 'dairy', [['Grated Parmesan Cheese', '8 oz', 3.48, 's'], ['BelGioioso Shredded Parmesan', '5 oz', 3.97, 'n']], ['parmesan']),
  e('sour cream', '🥣', 'dairy', [['Sour Cream', '16 oz', 1.98, 's'], ['Daisy Sour Cream', '16 oz', 2.78, 'n']]),
  e('butter', '🧈', 'dairy', [['Salted Butter Sticks', '1 lb', 3.97, 's'], ['Kerrygold Pure Irish Butter', '8 oz', 3.98, 'n']]),
  e('extra-firm tofu', '🧊', 'produce', [['Extra Firm Tofu', '14 oz', 1.98, 's'], ['Nasoya Organic Extra Firm Tofu', '14 oz', 2.67, 'n']], ['tofu', 'firm tofu']),
  e('hummus', '🫙', 'dairy', [['Classic Hummus', '10 oz', 2.48, 's'], ['Sabra Classic Hummus', '10 oz', 3.98, 'n']]),

  // Bakery & grains
  e('whole wheat bread', '🍞', 'bakery', [['100% Whole Wheat Bread', '20 oz', 1.97, 's'], ["Dave's Killer Bread 21 Whole Grains", '27 oz', 5.98, 'n']], ['bread', 'wheat bread']),
  e('sourdough bread', '🍞', 'bakery', [['Sourdough Bread Loaf', '24 oz', 3.48, 's']]),
  e('tortilla', '🫓', 'bakery', [['Flour Tortillas, 10 ct', '10 ct', 2.18, 's'], ['Mission Carb Balance Whole Wheat Tortillas', '8 ct', 3.98, 'n']], ['flour tortilla', 'wheat tortilla']),
  e('corn tortilla', '🫓', 'bakery', [['White Corn Tortillas, 30 ct', '30 ct', 2.28, 's'], ['Mission Yellow Corn Tortillas', '30 ct', 2.98, 'n']]),
  e('burger bun', '🍔', 'bakery', [['Hamburger Buns, 8 ct', '8 ct', 1.42, 's'], ["Martin's Potato Rolls", '8 ct', 3.98, 'n']], ['hamburger bun', 'bun']),
  e('brown rice', '🍚', 'grains', [['Long Grain Brown Rice', '2 lb', 2.12, 's'], ["Uncle Ben's Ready Rice Brown", '8.8 oz', 1.98, 'n']]),
  e('jasmine rice', '🍚', 'grains', [['Jasmine Rice', '2 lb', 3.24, 's'], ['Mahatma Jasmine Rice', '5 lb', 6.98, 'n']], ['rice', 'white rice']),
  e('quinoa', '🌾', 'grains', [['White Quinoa', '16 oz', 3.47, 's'], ['Organic Tri-Color Quinoa', '12 oz', 4.24, 'o']]),
  e('rolled oats', '🌾', 'grains', [['Old Fashioned Oats', '42 oz', 3.98, 's'], ["Quaker Old Fashioned Oats", '18 oz', 3.68, 'n']], ['oats', 'old fashioned oats']),
  e('granola', '🥣', 'grains', [['Oats & Honey Granola', '12 oz', 2.97, 's'], ['Nature Valley Protein Granola', '11 oz', 4.48, 'n']]),
  e('penne pasta', '🍝', 'grains', [['Penne Rigate Pasta', '16 oz', 1.14, 's'], ['Barilla Penne', '16 oz', 1.88, 'n']], ['penne', 'pasta']),
  e('spaghetti', '🍝', 'grains', [['Spaghetti Pasta', '16 oz', 1.14, 's'], ['Barilla Thin Spaghetti', '16 oz', 1.88, 'n']]),
  e('bread crumbs', '🍞', 'grains', [['Plain Bread Crumbs', '15 oz', 1.68, 's'], ['Panko Bread Crumbs', '8 oz', 2.48, 's']], ['panko']),
  e('crouton', '🍞', 'grains', [['Seasoned Croutons', '5 oz', 1.47, 's']]),
  e('lentils', '🫘', 'grains', [['Dry Lentils', '16 oz', 1.58, 's']], ['lentil']),

  // Canned & pantry
  e('black beans', '🫘', 'canned', [['Black Beans', '15 oz', 0.86, 's'], ["Bush's Black Beans", '15 oz', 1.38, 'n'], ['Organic Black Beans', '15 oz', 1.18, 'o']], ['black bean']),
  e('kidney bean', '🫘', 'canned', [['Dark Red Kidney Beans', '15.5 oz', 0.86, 's']], ['kidney beans']),
  e('chickpeas', '🫘', 'canned', [['Chick Peas / Garbanzo Beans', '15.5 oz', 0.86, 's'], ["Goya Chick Peas", '15.5 oz', 1.48, 'n']], ['garbanzo beans']),
  e('canned tomato', '🥫', 'canned', [['Petite Diced Tomatoes', '14.5 oz', 0.98, 's'], ["Hunt's Diced Tomatoes", '28 oz', 2.18, 'n']], ['canned diced tomatoes', 'diced tomatoes']),
  e('coconut milk', '🥥', 'canned', [['Coconut Milk', '13.5 fl oz', 1.84, 's'], ['Thai Kitchen Coconut Milk', '13.66 fl oz', 2.58, 'n']]),
  e('water chestnut', '🌰', 'canned', [['Sliced Water Chestnuts', '8 oz', 1.48, 'n']]),
  e('marinara sauce', '🥫', 'canned', [['Traditional Pasta Sauce', '24 oz', 1.68, 's'], ["Rao's Homemade Marinara", '24 oz', 7.48, 'n']], ['pasta sauce', 'marinara']),
  e('vegetable broth', '🥣', 'canned', [['Vegetable Broth', '32 fl oz', 1.88, 's'], ['Swanson Vegetable Broth', '32 fl oz', 2.68, 'n']]),
  e('chicken broth', '🥣', 'canned', [['Chicken Broth', '32 fl oz', 1.88, 's'], ['Swanson Chicken Broth', '32 fl oz', 2.68, 'n']]),
  e('kalamata olive', '🫒', 'canned', [['Pitted Kalamata Olives', '6 oz', 3.48, 's']], ['olives']),
  e('salsa', '🫙', 'condiments', [['Medium Chunky Salsa', '16 oz', 1.97, 's'], ['Pace Medium Chunky Salsa', '24 oz', 3.48, 'n']]),
  e('pesto', '🌿', 'condiments', [['Basil Pesto', '6.7 oz', 3.48, 's'], ['Buitoni Basil Pesto', '7 oz', 4.98, 'n']]),
  e('caesar dressing', '🥗', 'condiments', [['Caesar Dressing', '16 fl oz', 1.98, 's'], ["Ken's Steak House Caesar", '16 fl oz', 3.28, 'n']]),
  e('mayonnaise', '🫙', 'condiments', [['Mayonnaise', '30 fl oz', 3.48, 's'], ["Hellmann's Real Mayonnaise", '30 fl oz', 5.48, 'n']], ['mayo']),
  e('dijon mustard', '🫙', 'condiments', [['Dijon Mustard', '12 oz', 1.68, 's'], ['Grey Poupon Dijon', '8 oz', 3.48, 'n']]),
  e('soy sauce', '🫙', 'condiments', [['Soy Sauce', '15 fl oz', 1.48, 's'], ['Kikkoman Less Sodium Soy Sauce', '10 fl oz', 3.28, 'n']], ['tamari']),
  e('teriyaki sauce', '🫙', 'condiments', [['Teriyaki Sauce', '20 fl oz', 2.48, 's'], ['Kikkoman Teriyaki Marinade', '10 fl oz', 3.28, 'n']]),
  e('honey', '🍯', 'condiments', [['Pure Clover Honey', '12 oz', 3.82, 's'], ['Organic Raw Honey', '16 oz', 7.48, 'o']]),
  e('peanut butter', '🥜', 'condiments', [['Creamy Peanut Butter', '16.3 oz', 1.98, 's'], ['Jif Creamy Peanut Butter', '16 oz', 3.12, 'n'], ['Organic Creamy Peanut Butter', '16 oz', 3.98, 'o']]),
  e('almond butter', '🥜', 'condiments', [['Creamy Almond Butter', '12 oz', 5.98, 's'], ["Justin's Classic Almond Butter", '12 oz', 8.48, 'n']]),
  e('tahini', '🫙', 'condiments', [['Tahini', '16 oz', 5.48, 'n']]),
  e('olive oil', '🫒', 'pantry', [['Extra Virgin Olive Oil', '16.9 fl oz', 5.42, 's'], ['Bertolli Extra Virgin Olive Oil', '25.3 fl oz', 9.98, 'n']], ['extra virgin olive oil']),
  e('sesame oil', '🫙', 'pantry', [['Toasted Sesame Oil', '5 fl oz', 3.28, 'n']]),
  e('cornstarch', '🌽', 'pantry', [['Corn Starch', '16 oz', 1.32, 's']]),
  e('chia seeds', '🌱', 'pantry', [['Chia Seeds', '12 oz', 3.98, 's']]),
  e('sesame seeds', '🌱', 'spices', [['Sesame Seeds', '2.4 oz', 2.48, 's']]),
  e('dark chocolate chip', '🍫', 'snacks', [['Semi-Sweet Chocolate Chips', '12 oz', 2.48, 's'], ['Ghirardelli 60% Cacao Chips', '10 oz', 4.48, 'n']], ['chocolate chips']),
  e('almonds', '🌰', 'snacks', [['Whole Natural Almonds', '16 oz', 5.98, 's'], ['Blue Diamond Whole Almonds', '16 oz', 7.48, 'n']], ['almond']),

  // Frozen
  e('frozen corn', '🌽', 'frozen', [['Frozen Sweet Corn', '12 oz', 1.14, 's']], ['corn']),
  e('frozen mixed berry', '🫐', 'frozen', [['Frozen Mixed Berries', '48 oz', 9.47, 's'], ['Frozen Mixed Berries', '16 oz', 3.47, 's']], ['frozen berries']),
  e('frozen edamame', '🫛', 'frozen', [['Frozen Shelled Edamame', '12 oz', 2.12, 's'], ['Frozen Edamame in Pods', '16 oz', 2.48, 's']], ['edamame']),
  e('frozen peas', '🫛', 'frozen', [['Frozen Sweet Peas', '12 oz', 1.14, 's']]),

  // Spices
  e('salt', '🧂', 'spices', [['Iodized Salt', '26 oz', 0.74, 's'], ['Morton Kosher Salt', '3 lb', 3.28, 'n']], ['kosher salt', 'sea salt']),
  e('black pepper', '🧂', 'spices', [['Ground Black Pepper', '3 oz', 2.18, 's'], ['McCormick Black Peppercorn Grinder', '1 oz', 3.12, 'n']]),
  e('chili powder', '🌶️', 'spices', [['Chili Powder', '2.5 oz', 1.12, 's'], ['McCormick Chili Powder', '2.5 oz', 2.98, 'n']]),
  e('cumin', '🧂', 'spices', [['Ground Cumin', '1.5 oz', 1.32, 's'], ['McCormick Ground Cumin', '1.5 oz', 3.68, 'n']]),
  e('smoked paprika', '🧂', 'spices', [['Smoked Paprika', '1.7 oz', 2.12, 's']], ['paprika']),
  e('turmeric', '🧂', 'spices', [['Ground Turmeric', '1.6 oz', 1.68, 's']]),
  e('cinnamon', '🧂', 'spices', [['Ground Cinnamon', '2.4 oz', 1.12, 's']]),
  e('dried oregano', '🌿', 'spices', [['Oregano Leaves', '0.75 oz', 1.12, 's']], ['oregano']),
  e('italian seasoning', '🌿', 'spices', [['Italian Seasoning', '0.95 oz', 1.12, 's']]),
  e('curry powder', '🧂', 'spices', [['Curry Powder', '1.8 oz', 2.48, 's']]),
  e('taco seasoning', '🌮', 'spices', [['Taco Seasoning Mix', '1 oz', 0.54, 's'], ['Old El Paso Taco Seasoning', '1 oz', 0.98, 'n']]),
  e('red pepper flakes', '🌶️', 'spices', [['Crushed Red Pepper Flakes', '1.5 oz', 1.32, 's']]),
  e('everything bagel seasoning', '🥯', 'spices', [['Everything Bagel Seasoning', '2.3 oz', 1.98, 's']]),
];

const BY_KEY = new Map<string, CatalogEntry>();
for (const entry of CATALOG) {
  BY_KEY.set(canonicalName(entry.key), entry);
  for (const a of entry.aliases ?? []) if (!BY_KEY.has(canonicalName(a))) BY_KEY.set(canonicalName(a), entry);
}

export function findCatalogEntry(name: string): CatalogEntry | undefined {
  return BY_KEY.get(canonicalName(name));
}

export function categoryFor(name: string): Category {
  return findCatalogEntry(name)?.category ?? 'other';
}

/** Fuzzy lookup for free-text search queries ("boneless chicken" -> chicken breast). */
export function searchCatalog(query: string): CatalogEntry[] {
  const direct = findCatalogEntry(query);
  if (direct) return [direct];
  const words = canonicalName(query).split(' ').filter((w) => w.length > 2);
  if (!words.length) return [];
  const scored = CATALOG.map((entry) => {
    const hay = [entry.key, ...(entry.aliases ?? [])].join(' ');
    const hits = words.filter((w) => hay.includes(w)).length;
    return { entry, score: hits / words.length - (hay.length / 400) };
  }).filter((s) => s.score > 0.45);
  return scored.sort((a, b) => b.score - a.score).slice(0, 2).map((s) => s.entry);
}
