
import { useMemo, useState } from 'react'
import { Search, ShoppingCart, Plus, Minus, UtensilsCrossed } from 'lucide-react'
import './App.css'

type Food = {
  id: number
  name: string
  category: string
  price: number
  emoji: string
  description: string
}

const foods: Food[] = [
  { id: 1, name: 'Hyderabadi Biryani', category: 'Biryani', price: 249, emoji: '🍛', description: 'Aromatic rice with rich spices' },
  { id: 2, name: 'Margherita Pizza', category: 'Pizza', price: 299, emoji: '🍕', description: 'Classic cheese and tomato pizza' },
  { id: 3, name: 'Masala Dosa', category: 'South Indian', price: 129, emoji: '🥞', description: 'Crispy dosa with potato filling' },
  { id: 4, name: 'Paneer Butter Masala', category: 'North Indian', price: 219, emoji: '🍲', description: 'Creamy paneer curry' },
  { id: 5, name: 'Veg Burger', category: 'Fast Food', price: 149, emoji: '🍔', description: 'Fresh vegetables and crispy patty' },
  { id: 6, name: 'Hakka Noodles', category: 'Chinese', price: 179, emoji: '🍜', description: 'Stir-fried noodles with vegetables' },
]

const categories = ['All', ...new Set(foods.map(food => food.category))]

export default function App() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [cart, setCart] = useState<Record<number, number>>({})

  const filteredFoods = useMemo(
    () => foods.filter(food =>
      (category === 'All' || food.category === category) &&
      `${food.name} ${food.description}`.toLowerCase().includes(search.toLowerCase())
    ),
    [search, category]
  )

  const addItem = (id: number) =>
    setCart(previous => ({ ...previous, [id]: (previous[id] || 0) + 1 }))

  const removeItem = (id: number) =>
    setCart(previous => {
      const updated = { ...previous }
      if (updated[id] > 1) updated[id]--
      else delete updated[id]
      return updated
    })

  const cartCount = Object.values(cart).reduce((sum, qty) => sum + qty, 0)
  const total = foods.reduce((sum, food) => sum + food.price * (cart[food.id] || 0), 0)

  return (
    <div className="app">
      <header className="navbar">
        <a href="/" className="logo"><UtensilsCrossed size={26} /> Tabelo<span>.</span></a>
        <nav>
          <a href="#menu">Explore Menu</a>
          <a href="#about">About</a>
        </nav>
        <a className="cart-link" href="#cart">
          <ShoppingCart size={20} /> Cart ({cartCount})
        </a>
      </header>

      <main>
        <section className="hero">
          <div>
            <span className="eyebrow">WELCOME TO TABELO</span>
            <h1>Delicious food, <span>smarter ordering.</span></h1>
            <p>Explore amazing dishes and discover a better way to order. Your AI food assistant is coming soon!</p>
            <a href="#menu" className="primary-button">Explore Menu</a>
          </div>
          <div className="hero-art" aria-label="Food illustration">🍽️</div>
        </section>

        <section id="menu" className="menu-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">DISCOVER YOUR FAVORITES</span>
              <h2>Explore our menu</h2>
            </div>
            <div className="search-box">
              <Search size={19} />
              <input
                aria-label="Search dishes"
                placeholder="Search for dishes..."
                value={search}
                onChange={event => setSearch(event.target.value)}
              />
            </div>
          </div>

          <div className="categories">
            {categories.map(item => (
              <button
                key={item}
                className={category === item ? 'category active' : 'category'}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="food-grid">
            {filteredFoods.map(food => (
              <article className="food-card" key={food.id}>
                <div className="food-image">{food.emoji}</div>
                <div className="food-content">
                  <span className="food-category">{food.category}</span>
                  <h3>{food.name}</h3>
                  <p>{food.description}</p>
                  <div className="food-bottom">
                    <strong>₹{food.price}</strong>
                    <button onClick={() => addItem(food.id)}>
                      <Plus size={16} /> Add
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          {filteredFoods.length === 0 && <p>No dishes found. Try another search.</p>}
        </section>

        <section id="cart" className="cart-section">
          <h2><ShoppingCart size={25} /> Your Cart</h2>
          {cartCount === 0 ? (
            <p>Your cart is empty. Add something delicious!</p>
          ) : (
            <>
              {foods.filter(food => cart[food.id]).map(food => (
                <div className="cart-item" key={food.id}>
                  <span>{food.name} — ₹{food.price}</span>
                  <div className="quantity">
                    <button aria-label={`Remove ${food.name}`} onClick={() => removeItem(food.id)}><Minus size={16} /></button>
                    <strong>{cart[food.id]}</strong>
                    <button aria-label={`Add ${food.name}`} onClick={() => addItem(food.id)}><Plus size={16} /></button>
                  </div>
                </div>
              ))}
              <div className="cart-total"><strong>Subtotal</strong><strong>₹{total}</strong></div>
              <p className="cart-note">Demo cart only. Checkout and payments will be added later.</p>
            </>
          )}
        </section>

        <section id="about" className="about-section">
          <h2>Meet Tabelo</h2>
          <p>We're building a smarter restaurant ordering experience with easy menus, direct ordering, and AI-powered food recommendations.</p>
        </section>
      </main>

      <footer>© {new Date().getFullYear()} Tabelo. Built for food lovers.</footer>
    </div>
  )
}
