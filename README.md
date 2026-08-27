# Lyfe-PharmaSync
For our Capstone Project 

HTML Requested Edit or Error:




CSS Requested Edit or Error:




JAVASCRIPT Requested Edit or Error:
Line 120 in script.js




PHP Requested Edit or Error:
Line 43 in authentication.php 
Line 144 in authentication.php



NOTE:

so now everyone creating an account would be an employee and only an owner has to decide if he would promote the user to be an admin or not (also being an admin makes them access the admin dashboard)


should we create a button where the account of admin can switch dashboard on to an employee dashboard?


kulang yung sa ui ng reset password
keypoints:
- ano nga ba yung need don? pag email lang ilalagay, malilito si system kung sino yung irereset. 
- next after successful reset notif sent, ano na mangyayari? san maglalagay si user ng username nya or new password. solution: maybe we can use fb forgotpassword ui design?

steps for the solution:
1. find account using username (or email or phonenumber kaso need ata unique or di na nauulit yung phonenumber or email meaning one email per acc?) 
2. get sms code or email code 
3. after confirming, user can now change password (with confirm new password) NO MORE confirmation from admin due to the logic of managing one's own account.
0. last resort need magdagdag ng feature sa admin user control to change the pass for other accounts however need to add change password on the user control of every user.



change username, edit profile info ui page?
upgrading or promoting an account into admin using the admin account.

what would happen if we registered a username already on the database? same concern if use the same phone number or email