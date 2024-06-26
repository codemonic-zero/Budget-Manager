import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, collection, addDoc, query, where, getDocs } from 'firebase/firestore';

const GroupDetails = () => {
  const { groupId } = useParams();
  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const fetchGroup = async () => {
      try {
        const docRef = doc(db, 'groups', groupId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setGroup(docSnap.data());
        } else {
          console.log('No such document!');
        }
      } catch (error) {
        console.error('Error fetching group: ', error);
      }
    };

    fetchGroup();
  }, [groupId]);

  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        const expensesQuery = query(collection(db, 'groups', groupId, 'expenses'));
        const expensesSnapshot = await getDocs(expensesQuery);
        const expensesData = expensesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setExpenses(expensesData);
      } catch (error) {
        console.error('Error fetching expenses: ', error);
      }
    };

    fetchExpenses();
  }, [groupId]);

  useEffect(() => {
    if (group && group.members) {
      const totalExpenses = expenses.reduce((acc, expense) => acc + expense.amount, 0);
      const sharePerPerson = totalExpenses / group.members.length;

      const userExpenses = group.members.reduce((acc, member) => {
        const paid = expenses.filter(expense => expense.paidBy === member.id).reduce((total, expense) => total + expense.amount, 0);
        const share = paid - sharePerPerson;
        acc[member.id] = share;
        return acc;
      }, {});

      setBalances(userExpenses);
    }
  }, [group, expenses]);

  const addExpense = async (description, amount, paidBy) => {
    const newExpense = { description, amount: parseFloat(amount), paidBy, createdAt: new Date() };

    try {
      await addDoc(collection(db, 'groups', groupId, 'expenses'), newExpense);
      setExpenses([...expenses, newExpense]);
    } catch (error) {
      console.error('Error adding expense: ', error);
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-gray-100 ml-64 min-h-screen flex flex-col justify-between bg-gray-100 items-center">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-screen-md md:max-w-screen-lg lg:max-w-screen-2xl mx-auto mt-12">
        <h2 className="text-2xl font-bold mb-6">{group?.groupName}</h2>
        <div>
          <ExpenseForm group={group} addExpense={addExpense} />
        </div>
        <div className="mt-8">
          <h3 className="text-xl font-bold mb-2">Balances</h3>
          <ul>
            {Object.entries(balances).map(([userId, balance]) => (
              <li key={userId} className={`mb-2 ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {group.members.find(member => member.id === userId)?.displayName || userId}: {balance > 0 ? `receives ₹${balance.toFixed(2)}` : `owes ₹${(-balance).toFixed(2)}`}
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-8">
          <button
            onClick={() => navigate(`/groups/${groupId}/history`)}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            View Transaction History
          </button>
        </div>
      </div>
    </div>
  );
};

const ExpenseForm = ({ group, addExpense }) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    addExpense(description, amount, paidBy);
    setDescription('');
    setAmount('');
    setPaidBy('');
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* <div className="min-h-screen flex flex-col justify-between bg-gray-100 items-center ml-64">
        <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-screen-md md:max-w-screen-lg lg:max-w-screen-2xl mx-auto mt-12"> */}
          <div className="mb-4">
            <label htmlFor="description" className="block text-gray-700 text-sm font-bold mb-2">Description</label>
            <input type="text" id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" />
          </div>
          <div className="mb-4">
            <label htmlFor="amount" className="block text-gray-700 text-sm font-bold mb-2">Amount</label>
            <input type="number" id="amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" />
          </div>
          <div className="mb-4">
            <label htmlFor="paidBy" className="block text-gray-700 text-sm font-bold mb-2">Paid By</label>
            <select id="paidBy" value={paidBy} onChange={(e) => setPaidBy(e.target.value)} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline">
              <option value="">Select...</option>
              {group && group.members && group.members.map(member => (
                <option key={member.id} value={member.id}>{member.displayName}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">Add Expense</button>
        {/* </div>
      </div> */}
    </form>
  );
};

export default GroupDetails;
