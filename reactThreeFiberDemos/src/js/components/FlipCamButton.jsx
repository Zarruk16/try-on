import React from 'react'

const FlipCamButton = React.forwardRef((props, ref) => {
  return (
    <div ref={ref} onClick={props.onClick} className='FlipCamButton'>
       Flip Camera
    </div>
  )
})

FlipCamButton.displayName = 'FlipCamButton'

export default FlipCamButton