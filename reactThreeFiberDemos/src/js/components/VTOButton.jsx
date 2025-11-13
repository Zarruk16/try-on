import React from 'react'
import { Button } from 'antd'

const VTOButton = React.forwardRef((props, ref) => {
  return (
    <Button ref={ref} onClick={props.onClick} type='primary' size='large'>
      {props.children}
    </Button>
  )
})

VTOButton.displayName = 'VTOButton'

export default VTOButton