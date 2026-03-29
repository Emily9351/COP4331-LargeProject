import 'package:flutter/material.dart';

class LoginPage extends StatefulWidget {
  @override
  _LoginPageState createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final emailController = TextEditingController();
  final passwordController = TextEditingController();

  void handleLogin() {
    if (emailController.text.isNotEmpty &&
        passwordController.text.isNotEmpty) {
      Navigator.pushNamed(context, '/dashboard');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          // 🌄 Background Image
          Positioned.fill(
            child: Image.asset(
              'assets/images/UpBackground.png',
              fit: BoxFit.cover, // same as background-size: cover
            ),
          ),

          // 🌑 Overlay
          Positioned.fill(
            child: Container(
              color: Colors.black.withOpacity(0.5),
            ),
          ),

          // 📦 Login Card
          Center(
            child: Container(
              width: 350,
              padding: EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: const Color.fromARGB(255, 0, 6, 22).withOpacity(0.9),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // 🏠 Icon
                  Image.asset(
                    'assets/images/UpIcon.png',
                    height: 60,
                  ),

                  SizedBox(height: 16),

                  Text(
                    "Adventure Awaits",
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: const Color.fromARGB(255, 255, 255, 255)
                    ),
                  ),

                  Text(
                    "Reach New Heights One Task at a Time",
                    style: TextStyle(
                      color: const Color.fromARGB(255, 139, 149, 206),
                      fontWeight: FontWeight.w500
                    ),
                  ),

                  SizedBox(height: 20),

                  // 📧 Email
                  TextField(
                    controller: emailController,
                    decoration: InputDecoration(
                      prefixIcon: Icon(Icons.email, color: const Color.fromARGB(179, 151, 184, 255)),
                      labelText: "Email",
                      labelStyle: TextStyle(color: Colors.white70),
                    ),
                    style: TextStyle(
                      color: Colors.white
                    )
                  ),

                  SizedBox(height: 12),

                  // 🔒 Password
                  TextField(
                    controller: passwordController,
                    obscureText: true,
                    decoration: InputDecoration(
                      prefixIcon: Icon(Icons.lock, color: const Color.fromARGB(179, 151, 184, 255)),
                      labelText: "Password",
                      labelStyle: TextStyle(color: Colors.white70),
                    ),
                  ),

                  SizedBox(height: 20),

                  // 🔘 Button
                  ElevatedButton(
                    onPressed: handleLogin,
                    style: ElevatedButton.styleFrom(
                      minimumSize: Size(double.infinity, 45),
                      foregroundColor: const Color.fromARGB(255, 0, 9, 88),
                    ),
                    child: Text(
                      "Sign In",
                      style: TextStyle(
                        fontWeight: FontWeight.w600
                      )
                      ),
                  ),

                  SizedBox(height: 12),

                  TextButton(
                    onPressed: () {
                      Navigator.pushNamed(context, '/registration');
                    },
                    child: Text("Don't have an account? Create one"),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}