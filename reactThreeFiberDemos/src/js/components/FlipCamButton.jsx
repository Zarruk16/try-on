import React from 'react'
import { Button } from 'antd'

const FlipCamButton = React.forwardRef((props, ref) => {
  return (
    <div className='FlipCamButton'>
      <Button ref={ref} type='primary' size='large' block onClick={props.onClick}>Flip Camera</Button>
    </div>
  )
})

FlipCamButton.displayName = 'FlipCamButton'

export default FlipCamButton