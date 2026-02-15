 
import { NavLink } from 'react-router'
export const Navbar = () => {
  return (
    <div className='place-content-evenly flex flex-row mt-8'>
      <NavLink to="/">Home</NavLink>
       <NavLink to="/Notes">All Notes</NavLink>
         <NavLink to="/Archieve">Archieve</NavLink>
           <NavLink to="/Important">Important</NavLink>
             <NavLink to="/Bin">Bin</NavLink>

    </div>
  )
}

 
