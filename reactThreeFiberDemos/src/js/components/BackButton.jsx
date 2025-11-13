import { Link } from 'react-router-dom'
import { Button } from 'antd'

export default function BackButton() {
  return (
    <div className='BackButton'>
      <Link to='/'>
        <Button type='primary' ghost>Back</Button>
      </Link>
    </div>
  )
}