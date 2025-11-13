import { Link } from 'react-router-dom'

export default function BackButton() {
  return (
    <div className='BackButton'>
      <Link to='/'>BACK</Link>
    </div>
  )
}