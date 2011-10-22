<?php
  
  $filesize = 20971520; // 20 Mo

  if(isset($_POST['d'])) {

    header('Cache-Control: no-cache');
    header('Content-Transfer-Encoding: binary');
    header('Content-Length: '. $filesize);

    for($i = 0 ; $i < $filesize ; $i++) {
      echo chr(255);
    }

  }

?>