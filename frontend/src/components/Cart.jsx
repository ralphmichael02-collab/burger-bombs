export default function Cart({ cart, setCart, onSubmit, submitting }) {
  const total = cart.reduce((s, c) => s + c.price * c.qty, 0);

  return (
    <div className="bg-white p-4 rounded shadow h-full flex flex-col">
      <h2 className="font-bold text-lg mb-2">Cart</h2>

      {cart.length === 0 && <p className="text-gray-500">No items yet.</p>}

      <ul className="flex-1 space-y-2">
        {cart.map((c) => (
          <li key={c.id} className="flex justify-between items-center">
            <span>{c.name} × {c.qty}</span>
            <span className="flex items-center gap-2">
              <button
                className="px-2 bg-gray-200 rounded"
                onClick={() =>
                  setCart(cart
                    .map(x => x.id === c.id ? { ...x, qty: x.qty - 1 } : x)
                    .filter(x => x.qty > 0))
                }
              >−</button>
              <button
                className="px-2 bg-gray-200 rounded"
                onClick={() =>
                  setCart(cart.map(x => x.id === c.id ? { ...x, qty: x.qty + 1 } : x))
                }
              >+</button>
            </span>
          </li>
        ))}
      </ul>

      <div className="border-t pt-2 mt-2">
        <div className="flex justify-between font-bold">
          <span>Total</span>
          <span>₱{total}</span>
        </div>
        <button
          disabled={cart.length === 0 || submitting}
          onClick={onSubmit}
          className="mt-2 w-full bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-300 text-white font-bold py-2 rounded"
        >
          {submitting ? 'Saving…' : 'Place Order'}
        </button>
      </div>
    </div>
  );
}