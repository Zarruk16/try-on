import { useState } from 'react'
import { Card, Form, Input, Button, Typography, Divider, Space } from 'antd'
import { Link } from 'react-router-dom'

export default function Signup(){
  const [loading] = useState(false)
  const onFinish = () => {}
  const onGoogle = () => {}
  const GoogleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.9 0-12.5-5.6-12.5-12.5S17.1 11 24 11c3.2 0 6.2 1.2 8.5 3.3l5.7-5.7C34.9 4.1 29.7 2 24 2 12.3 2 2.9 11.4 2.9 23.1S12.3 44.3 24 44.3c11.2 0 20.1-8.1 20.1-20.1 0-1.3-.1-2.4-.5-3.7z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 19 13 24 13c3.2 0 6.2 1.2 8.5 3.3l5.7-5.7C34.9 4.1 29.7 2 24 2 14.7 2 6.7 7.6 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44.3c5.7 0 10.9-2.1 14.9-5.7l-6.9-5.6c-2.1 1.5-4.8 2.4-8 2.4-5.1 0-9.6-3.3-11.2-8L6.2 31.4c3.3 6.6 10.1 10.9 17.8 10.9z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.3-3.6 6-6.8 7.5l6.9 5.6c4-3.7 6.7-9.2 6.7-15.8 0-1.3-.1-2.4-.5-3.7z"/>
    </svg>
  )
  return (
    <div style={{ minHeight: 'calc(110vh - 120px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
      <Card
        title={<Typography.Title level={2} style={{ margin: 0 }}>Create Account</Typography.Title>}
        styles={{ body: { paddingTop: 24, paddingBottom: 24 } }}
        style={{ width: 560, boxShadow: '0 0 0 2px rgba(43,74,203,0.35), 0 24px 64px rgba(43,74,203,0.45), 0 0 120px rgba(43,74,203,0.30)' }}
      >
        <Form layout="vertical" onFinish={onFinish} disabled={loading}>
          <Form.Item name="name" label="Full Name"> 
            <Input size="large" placeholder="Your name" />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}> 
            <Input size="large" placeholder="you@example.com" />
          </Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: true, min: 6 }]}> 
            <Input.Password size="large" placeholder="••••••••" />
          </Form.Item>
          <Form.Item name="confirm" label="Confirm Password" dependencies={["password"]} rules={[{ required: true }]}> 
            <Input.Password size="large" placeholder="••••••••" />
          </Form.Item>
          <Space size={12} style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button htmlType="submit" type="primary" size="large">Sign Up</Button>
            <Link to="/login"><Button size="large">Login</Button></Link>
          </Space>
        </Form>
        <Divider>or</Divider>
        <Button block onClick={onGoogle} size="large" icon={<GoogleIcon />}>Continue with Google</Button>
      </Card>
    </div>
  )
}
