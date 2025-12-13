import {useState} from 'react'
import './AddItemForm.css'

const AddItemForm = ({ }) => {
    const [name, setName] = useState('')
    const [quantity, setQuantity] = useState('')
    const [price, setPrice] = useState('')
    const [description, setDescription] = useState('')
    const [category, setCategory] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [successMessage, setSuccessMessage] = useState('')

    const onSubmit = async (e) => {
        e.preventDefault()
        const data = {
            name,
            quantity: parseInt(quantity, 10),
            price: parseFloat(price),
            description,
            category
        }

        const url = `${import.meta.env.VITE_API_URL}/inventory/create_item`
        const options = {
            method: 'POST',
            headers: {
                'Access-Control-Allow-Origin': 'http://localhost:5137',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        }
        
        setIsSubmitting(true)
        try {
            const response = await fetch(url, options)
            if (response.status !== 201 && response.status !== 200) {
                const errorData = await response.json()
                alert('Error: ' + (errorData.error || errorData.details || 'Unknown error'))
            }
            else {
                setSuccessMessage('Item added successfully')
                // clear form
                setName('')
                setQuantity(0)
                setPrice(0.0)
                setDescription('')
                setCategory('')
                // auto-hide success message
                setTimeout(() => setSuccessMessage(''), 3000)
            }
        } catch (err) {
            alert('Error adding item: ' + err)
        } finally {
            setIsSubmitting(false)
        }
    }
    
    return (
    <div className="form-container">
        <div className="form-header">
            <h2>Add New Item</h2>
        </div>
        <div className="form-card">
            <form onSubmit={onSubmit}>
                <div className="form-group">
                    <label htmlFor="name">Name</label>
                    <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>

                <div className="form-group">
                    <label htmlFor="quantity">Quantity</label>
                    <input type="number" id="quantity" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
                </div>

                <div className="form-group">
                    <label htmlFor="price">Price</label>
                    <input type="number" id="price" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required />
                </div>

                <div className="form-group">
                    <label htmlFor="description">Description</label>
                    <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>

                <div className="form-group">
                    <label htmlFor="category">Category</label>
                    <input type="text" id="category" value={category} onChange={(e) => setCategory(e.target.value)} />
                </div>

                <button type="submit" className="form-submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Adding...' : 'Add Item'}
                </button>
                {successMessage && <p style={{color: '#2b8a3e', marginTop: '0.75rem'}}>{successMessage}</p>}
            </form>
        </div>
    </div>
    )
}

export default AddItemForm;