<?php
if ($_SERVER["REQUEST_METHOD"] == "POST") {
 
    $email = $_POST['email'];

   
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo "Invalid email format.";
        exit;
    }

    
    $to = "freyanile1@gmail.com";  
    $subject = "New Email Subscription";  
    $message = "New email subscription: " . $email;  
    $headers = "From: no-reply@yourdomain.com";  

    
    if (mail($to, $subject, $message, $headers)) {
        echo "Thank you for subscribing!";  
    } else {
        echo "There was a problem submitting your email. Please try again later.";
    }
}
?>