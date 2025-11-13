import React from 'react'

const VTOButton = React.forwardRef((props, ref) => {
  return (
    <div ref={ref} onClick={props.onClick} className='VTOButton'>
       {props.children}
    </div>
  )
})

VTOButton.displayName = 'VTOButton'

export default VTOButton