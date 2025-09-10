Feature: Login

  Scenario: Usuario válido inicia sesión correctamente
    When ingresa las credenciales:
      | username      | password     |
      | standard_user | secret_sauce |
    Then debería ver el listado de productos

  Scenario: Usuario bloqueado
    When ingresa las credenciales:
      | username        | password     |
      | locked_out_user | secret_sauce |
    Then debería ver el error "Epic sadface: Sorry, this user has been locked out."
