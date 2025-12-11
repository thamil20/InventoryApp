import React, { useState, useEffect } from "react"
import "./CurrentInventoryList.css"

const CurrentInventoryList = () => {
    const [currentInventory, setCurrentInventory] = useState([])

    useEffect(() => {
        fetchCurrentInventory()
    }, [])

    const fetchCurrentInventory = async () => {
        const apiUrl = `${import.meta.env.VITE_API_URL}/inventory/current`
        const response = await fetch(apiUrl)
        const data = await response.json()
        setCurrentInventory(data.current_inventory)
        console.log(data.current_inventory)
    }

    const deleteItem = async (itemId) => {
        const apiUrl = `${import.meta.env.VITE_API_URL}/inventory/delete_item/${itemId}`
        try {
            const response = await fetch(apiUrl, { method: 'DELETE' })
            if (response.ok) {
                await fetch(`${import.meta.env.VITE_API_URL}/inventory/renumber`, { method: 'POST' })
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

    return <div className="inventory-container">
        <div className="inventory-header">
            <h2>Current Inventory</h2>
        </div>
        <div className="inventory-table-wrapper">
            {currentInventory.length === 0 ? (
                <div className="empty-state">
                    <p>No items in inventory</p>
                </div>
            ) : (
                <table className="inventory-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Quantity</th>
                            <th>Price</th>
                            <th>Description</th>
                            <th>Category</th>
                            <th>Added Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentInventory.map((item) => (
                            <tr key={item.itemId}>
                                <td>{item.itemId}</td>
                                <td>{item.name}</td>
                                <td>{item.quantity}</td>
                                <td>${item.price.toFixed(2)}</td>
                                <td>{item.description}</td>
                                <td>{item.category}</td>
                                <td>{formatDate(item.addedDate)}</td>
                                <td>
                                    <div className="action-buttons">
                                        <button className="btn btn-update">Update</button>
                                        <button className="btn btn-delete" onClick={() => deleteItem(item.itemId)}>Delete</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    </div>
}

export default CurrentInventoryList