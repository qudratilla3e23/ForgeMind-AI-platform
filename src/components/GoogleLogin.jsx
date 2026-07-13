import { GoogleLogin } from '@react-oauth/google';

export default function Login() {
  return (
    <div>
      <h1>Tizimga kirish</h1>
      
      {/* Alohida fayl ochmasdan, shu yerning o'zida tugmani qo'ydik */}
      <GoogleLogin
        onSuccess={credentialResponse => {
          console.log(credentialResponse);
        }}
        onError={() => {
          console.log('Login muvaffaqiyatsiz');
        }}
      />
    </div>
  );
}