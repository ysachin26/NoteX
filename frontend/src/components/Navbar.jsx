 
import { NavLink, useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { logOutThunk } from '../redux/features/authSlice'
import { LogOut } from 'lucide-react';

export const Navbar = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await dispatch(logOutThunk())
    navigate('/login')
  }

  return (
    <div className='place-content-evenly flex flex-row mt-8'>
      <NavLink to="/">Home</NavLink>
       <NavLink to="/Notes">All Notes</NavLink>
         <NavLink to="/Archieve">Archieve</NavLink>
           <NavLink to="/Important">Important</NavLink>
             <NavLink to="/Bin">Bin</NavLink>
              <button type="button" onClick={handleLogout} aria-label="Logout">
                <LogOut size={18} />
              </button>

    </div>
  )
}

 
