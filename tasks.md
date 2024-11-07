Next Tasks:
- check github access. Need git repo
- add simple game involving everyone
    - steps:
        - add cookie baking game
            - perparing cookies
            - put cookies in oven
            - take cookies out on time
                - to late -> cookies are black 
                - far to late, oven begins burning
                - to soon -> don't taste well
            - put into cookie jar
        - cookie eating command needs to take out a random cookie
            - 
            
    - eat cooking (only possible if cookies left).
    - bake cookie (takes some effort)
        - mini game where the ingredients have to be put in?
        - baked cookies are for every chatter
- outfits. Dogs can wear clothing. Store choices for chatters even when leaving

Big Idea:
- do some game for chatters.
    - chatter can play something while i do coding
    - chatter are "just" audiance and can emote somehow
        - think about simple options
        - command "throw ball"
    - chatter are a type of input for a game i build
        - idea: chatSim
            - each chatter becomes a citizen of a game world
                - moves mostly by itself but chatter can influence somethings


Tasks done today:
- make bake cookie command and cookie counter. No game required yet
    - voisualization of available cookies: cookie jar, 
        - should display correct amount of cookies?
- start with eating cookie command and animation. No cookies baking required yet
    - cookie image
        - cookie eating frames. Cookies eaten 0%, 33%, 66%
    - command
    - add animation
        - dog mouth animation
- add my app to OBS end screen
- tictactoe
    - add to displayed chat commands
    - don't delete players who play 
    - bug: if player leaves without taking his turn, game can not finish
        - if player does not play in a certain amount of time, he should lose the game
- game: tic tac toe
    - command1 "TicTacToe"
    - second chatter to write "TicTacToe" will join
    - how to place "top", "bottom", "left", "right", "middle"
    - will be displaye somewhere
    - possibility for multiple to play at the same time
    - each chatter can only play one thing at a time
- multiple chatterDogs row
- OBS overlay performance checks
    - framerate checks
    - add alot of chatterDogs who randomly chat and see performance
