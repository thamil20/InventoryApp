import React, { useState, useEffect } from "react"
import { useAuth } from './AuthContext'
import { useNavigate } from 'react-router-dom'
import "./CurrentInventoryList.css"

const CurrentInventoryList = () => {
    const { token, user } = useAuth()
    const navigate = useNavigate()
    const [currentInventory, setCurrentInventory] = useState([])
    const [selectedItem, setSelectedItem] = useState(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [isSellModalOpen, setIsSellModalOpen] = useState(false)
    const [editingItem, setEditingItem] = useState(null)
    const [sellingItem, setSellingItem] = useState(null)
    const [editForm, setEditForm] = useState({
        name: '',
        quantity: '',
        price: '',
        description: '',
        category: ''
    })
    const [sellForm, setSellForm] = useState({
        quantity_sold: '',
        sale_price: '',
        sale_date: new Date().toISOString().split('T')[0]
    })
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [filterColumn, setFilterColumn] = useState('all')
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })

    // Handle permission denied errors
    const handlePermissionError = (response, action = 'access this page') => {
        if (response.status === 403) {
            alert(`You don't have permission to ${action}. Redirecting to dashboard.`)
            navigate('/')
            return true
        }
        return false
    }

    useEffect(() => {
        fetchCurrentInventory()
    }, [])

    const fetchCurrentInventory = async () => {
        const apiUrl = `${import.meta.env.VITE_API_URL}/inventory/current`
        const response = await fetch(apiUrl, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        if (handlePermissionError(response, 'view inventory')) return
        const data = await response.json()
        setCurrentInventory(data.current_inventory)
        console.log(data.current_inventory)
    }

    const deleteItem = async (itemId) => {
        const apiUrl = `${import.meta.env.VITE_API_URL}/inventory/delete_item/${itemId}`
        try {
            const response = await fetch(apiUrl, { 
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            if (handlePermissionError(response, 'delete items')) return
            if (response.ok) {
                await fetch(`${import.meta.env.VITE_API_URL}/inventory/renumber`, { 
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                })
                fetchCurrentInventory()
            }else {
                const message = await response.json()
                alert(message.message)
            }
        }
        catch (error) {
            alert("Error deleting item:", error)
        }
    }

    const formatDate = (isoDate) => {
        const date = new Date(isoDate)
        return date.toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric',
        })
    }

    const openItemDetails = (item) => {
        setSelectedItem(item)
        setIsModalOpen(true)
    }

    const closeModal = () => {
        setIsModalOpen(false)
        setSelectedItem(null)
    }

    const openEditModal = (item) => {
        setEditingItem(item)
        setEditForm({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            description: item.description,
            category: item.category
        })
        setIsEditModalOpen(true)
    }

    const closeEditModal = () => {
        setIsEditModalOpen(false)
        setEditingItem(null)
        setEditForm({
            name: '',
            quantity: '',
            price: '',
            description: '',
            category: ''
        })
    }

    const openSellModal = (item) => {
        setSellingItem(item)
        setSellForm({
            quantity_sold: '',
            sale_price: item.price,
            sale_date: new Date().toISOString().split('T')[0]
        })
        setIsSellModalOpen(true)
    }

    const closeSellModal = () => {
        setIsSellModalOpen(false)
        setSellingItem(null)
        setSellForm({
            quantity_sold: '',
            sale_price: '',
            sale_date: new Date().toISOString().split('T')[0]
        })
    }

    const handleEditChange = (field, value) => {
        setEditForm(prev => ({ ...prev, [field]: value }))
    }

    const handleSellChange = (field, value) => {
        setSellForm(prev => ({ ...prev, [field]: value }))
    }

    const handleUpdateSubmit = async (e) => {
        e.preventDefault()
        setIsSubmitting(true)

        const data = {
            name: editForm.name,
            quantity: parseInt(editForm.quantity, 10),
            price: parseFloat(editForm.price),
            description: editForm.description,
            category: editForm.category
        }

        const url = `${import.meta.env.VITE_API_URL}/inventory/update_item/${editingItem.itemId}`
        const options = {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data),
        }

        try {
            const response = await fetch(url, options)
            if (handlePermissionError(response, 'edit items')) return
            if (response.ok) {
                await fetchCurrentInventory()
                closeEditModal()
            } else {
                const errorData = await response.json()
                alert('Error: ' + (errorData.error || errorData.details || 'Unknown error'))
            }
        } catch (err) {
            alert('Error updating item: ' + err)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleSellSubmit = async (e) => {
        e.preventDefault()
        setIsSubmitting(true)

        const quantitySold = parseInt(sellForm.quantity_sold, 10)
        
        if (quantitySold > sellingItem.quantity) {
            alert(`Cannot sell ${quantitySold} items. Only ${sellingItem.quantity} available in inventory.`)
            setIsSubmitting(false)
            return
        }

        const data = {
            quantity_sold: quantitySold,
            sale_price: parseFloat(sellForm.sale_price),
            sale_date: new Date(sellForm.sale_date).toISOString()
        }

        const url = `${import.meta.env.VITE_API_URL}/inventory/sell_item/${sellingItem.itemId}`
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data),
        }

        try {
            const response = await fetch(url, options)
            if (handlePermissionError(response, 'sell items')) return
            if (response.ok) {
                await fetchCurrentInventory()
                closeSellModal()
                alert('Item sold successfully!')
            } else {
                const errorData = await response.json()
                alert('Error: ' + (errorData.error || errorData.details || 'Unknown error'))
            }
        } catch (err) {
            alert('Error selling item: ' + err)
        } finally {
            setIsSubmitting(false)
        }
    }

    // Filter and search logic
    const filteredInventory = currentInventory.filter(item => {
        if (!searchTerm) return true
        
        const searchLower = searchTerm.toLowerCase()
        
        if (filterColumn === 'all') {
            return (
                item.name.toLowerCase().includes(searchLower) ||
                item.itemId.toString().includes(searchLower) ||
                item.quantity.toString().includes(searchLower) ||
                item.price.toString().includes(searchLower) ||
                (item.description && item.description.toLowerCase().includes(searchLower)) ||
                (item.category && item.category.toLowerCase().includes(searchLower))
            )
        }
        
        // Filter by specific column
        const value = item[filterColumn]
        if (value === null || value === undefined) return false
        return value.toString().toLowerCase().includes(searchLower)
    })

    // Sort logic
    const sortedInventory = [...filteredInventory].sort((a, b) => {
        if (!sortConfig.key) return 0

        let aValue = a[sortConfig.key]
        let bValue = b[sortConfig.key]

        // Handle null/undefined values
        if (aValue === null || aValue === undefined) aValue = ''
        if (bValue === null || bValue === undefined) bValue = ''

        // Convert to lowercase for string comparison
        if (typeof aValue === 'string') aValue = aValue.toLowerCase()
        if (typeof bValue === 'string') bValue = bValue.toLowerCase()

        if (aValue < bValue) {
            return sortConfig.direction === 'asc' ? -1 : 1
        }
        if (aValue > bValue) {
            return sortConfig.direction === 'asc' ? 1 : -1
        }
        return 0
    })

    const handleSort = (key) => {
        let direction = 'asc'
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc'
        }
        setSortConfig({ key, direction })
    }

    const getSortIndicator = (columnKey) => {
        if (sortConfig.key !== columnKey) return ' ↕'
        return sortConfig.direction === 'asc' ? ' ↑' : ' ↓'
    }

    return <div className="inventory-container">
        <div className="inventory-header">
            <h2>Current Inventory</h2>
        </div>
        <div className="search-filter-container">
            <select 
                value={filterColumn} 
                onChange={(e) => setFilterColumn(e.target.value)}
                className="filter-dropdown"
            >
                <option value="all">All Columns</option>
                <option value="itemId">ID</option>
                <option value="name">Name</option>
                <option value="quantity">Quantity</option>
                <option value="price">Price</option>
                <option value="description">Description</option>
                <option value="category">Category</option>
            </select>
            <input
                type="text"
                placeholder={`Search ${filterColumn === 'all' ? 'all columns' : filterColumn}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
            />
            {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="clear-search-btn">
                    ✕
                </button>
            )}
        </div>
        <div className="inventory-table-wrapper">
            {currentInventory.length === 0 ? (
                <div className="empty-state">
                    <p>No items in inventory</p>
                </div>
            ) : sortedInventory.length === 0 ? (
                <div className="empty-state">
                    <p>No items match your search</p>
                </div>
            ) : (
                <table className="inventory-table">
                    <thead>
                        <tr>
                            <th onClick={() => handleSort('itemId')} className="sortable-header">
                                ID{getSortIndicator('itemId')}
                            </th>
                            <th onClick={() => handleSort('name')} className="sortable-header">
                                Name{getSortIndicator('name')}
                            </th>
                            <th onClick={() => handleSort('quantity')} className="sortable-header">
                                Quantity{getSortIndicator('quantity')}
                            </th>
                            <th onClick={() => handleSort('price')} className="sortable-header">
                                Price{getSortIndicator('price')}
                            </th>
                            <th onClick={() => handleSort('description')} className="sortable-header">
                                Description{getSortIndicator('description')}
                            </th>
                            <th onClick={() => handleSort('category')} className="sortable-header">
                                Category{getSortIndicator('category')}
                            </th>
                            <th onClick={() => handleSort('addedDate')} className="sortable-header">
                                Added Date{getSortIndicator('addedDate')}
                            </th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedInventory.map((item) => (
                            <tr key={item.itemId} onClick={() => openItemDetails(item)} className="clickable-row">
                                <td title={item.itemId}>{item.itemId}</td>
                                <td title={item.name}>{item.name}</td>
                                <td title={item.quantity}>{item.quantity}</td>
                                <td title={`$${item.price.toFixed(2)}`}>${item.price.toFixed(2)}</td>
                                <td title={item.description}>{item.description}</td>
                                <td title={item.category}>{item.category}</td>
                                <td title={formatDate(item.addedDate)}>{formatDate(item.addedDate)}</td>
                                <td onClick={(e) => e.stopPropagation()}>
                                    <div className="action-buttons">
                                        <button className="btn btn-sell" onClick={() => openSellModal(item)}>Sell</button>
                                        <button className="btn btn-update" onClick={() => openEditModal(item)}>Update</button>
                                        <button className="btn btn-delete" onClick={() => deleteItem(item.itemId)}>Delete</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
        
        {isModalOpen && selectedItem && (
            <div className="modal-overlay" onClick={closeModal}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                        <h3>Item Details</h3>
                        <button className="modal-close" onClick={closeModal}>&times;</button>
                    </div>
                    <div className="modal-body">
                        <div className="detail-row">
                            <span className="detail-label">ID:</span>
                            <span className="detail-value">{selectedItem.itemId}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Name:</span>
                            <span className="detail-value">{selectedItem.name}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Quantity:</span>
                            <span className="detail-value">{selectedItem.quantity}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Price:</span>
                            <span className="detail-value">${selectedItem.price.toFixed(2)}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Description:</span>
                            <span className="detail-value">{selectedItem.description}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Category:</span>
                            <span className="detail-value">{selectedItem.category}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Added Date:</span>
                            <span className="detail-value">{formatDate(selectedItem.addedDate)}</span>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {isEditModalOpen && editingItem && (
            <div className="modal-overlay" onClick={closeEditModal}>
                <div className="modal-content edit-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                        <h3>Edit Item</h3>
                        <button className="modal-close" onClick={closeEditModal}>&times;</button>
                    </div>
                    <div className="modal-body">
                        <form onSubmit={handleUpdateSubmit}>
                            <div className="form-group">
                                <label htmlFor="edit-name">Name</label>
                                <input 
                                    type="text" 
                                    id="edit-name" 
                                    value={editForm.name} 
                                    onChange={(e) => handleEditChange('name', e.target.value)} 
                                    required 
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="edit-quantity">Quantity</label>
                                <input 
                                    type="number" 
                                    id="edit-quantity" 
                                    value={editForm.quantity} 
                                    onChange={(e) => handleEditChange('quantity', e.target.value)} 
                                    required 
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="edit-price">Price</label>
                                <input 
                                    type="number" 
                                    id="edit-price" 
                                    step="0.01" 
                                    value={editForm.price} 
                                    onChange={(e) => handleEditChange('price', e.target.value)} 
                                    required 
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="edit-description">Description</label>
                                <textarea 
                                    id="edit-description" 
                                    value={editForm.description} 
                                    onChange={(e) => handleEditChange('description', e.target.value)} 
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="edit-category">Category</label>
                                <input 
                                    type="text" 
                                    id="edit-category" 
                                    value={editForm.category} 
                                    onChange={(e) => handleEditChange('category', e.target.value)} 
                                    required
                                />
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn btn-cancel" onClick={closeEditModal}>Cancel</button>
                                <button type="submit" className="btn btn-save" disabled={isSubmitting}>
                                    {isSubmitting ? 'Updating...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        )}

        {isSellModalOpen && sellingItem && (
            <div className="modal-overlay" onClick={closeSellModal}>
                <div className="modal-content edit-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                        <h3>Sell Item: {sellingItem.name}</h3>
                        <button className="modal-close" onClick={closeSellModal}>&times;</button>
                    </div>
                    <div className="modal-body">
                        <form onSubmit={handleSellSubmit}>
                            <div className="form-group">
                                <label htmlFor="sell-quantity">Quantity to Sell</label>
                                <input 
                                    type="number" 
                                    id="sell-quantity" 
                                    min="1"
                                    max={sellingItem.quantity}
                                    value={sellForm.quantity_sold} 
                                    onChange={(e) => handleSellChange('quantity_sold', e.target.value)} 
                                    required 
                                />
                                <small>Available: {sellingItem.quantity}</small>
                            </div>

                            <div className="form-group">
                                <label htmlFor="sell-price">Sale Price</label>
                                <input 
                                    type="number" 
                                    id="sell-price" 
                                    step="0.01"
                                    min="0.01" 
                                    value={sellForm.sale_price} 
                                    onChange={(e) => handleSellChange('sale_price', e.target.value)} 
                                    required 
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="sell-date">Sale Date</label>
                                <input 
                                    type="date" 
                                    id="sell-date" 
                                    value={sellForm.sale_date} 
                                    onChange={(e) => handleSellChange('sale_date', e.target.value)} 
                                    required
                                />
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn btn-cancel" onClick={closeSellModal}>Cancel</button>
                                <button type="submit" className="btn btn-save" disabled={isSubmitting}>
                                    {isSubmitting ? 'Processing...' : 'Confirm Sale'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        )}
    </div>
}

export default CurrentInventoryList