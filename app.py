import os
import sys
import uuid
sys.path.append(os.path.dirname(os.path.realpath(__file__)))

from flask import Flask, flash, jsonify, redirect, render_template, request, url_for
from werkzeug.utils import secure_filename

from .links_helper import analyse_chat

UPLOAD_FOLDER = 'uploads/'
FILE_NAME = "sharevault.txt"
ALLOWED_EXTENSIONS = {'txt'}

def _allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS
           
def _generate_session_id():
    return str(uuid.uuid4())

def create_app():
    app = Flask(__name__)
    app.secret_key = _generate_session_id()

    app.config.from_mapping(
        DEEPL_KEY = os.environ.get("DEEPL_KEY"),
        UPLOAD_FOLDER = UPLOAD_FOLDER,
        FILE_NAME = FILE_NAME
    )
    
    @app.route('/', methods=['GET'])
    def index():
        return render_template("index.html")

    @app.route('/upload', methods=['POST'])
    def upload_file():
        # check if the post request has the file part
        if 'file' not in request.files:
            flash('No file part')
            return redirect(url_for('index'))

        file = request.files['file']
        # If the user does not select a file, the browser submits an
        # empty file without a filename.
        if file.filename == '':
            flash('No selected file')
            return redirect(url_for('index'))

        if not _allowed_file(file.filename):
            flash("Only .txt files are allowed.")
            return redirect(url_for('index'))
        
        # filename = secure_filename(file.filename)
        filename = os.path.join(app.config['UPLOAD_FOLDER'], app.config['FILE_NAME'])
        file.save(filename)
        
        links = analyse_chat(filename)
        
        return jsonify({"file_contents": links}), 200 
    
    return app

if __name__ == "__main__":
    print(os.environ.get("SHAREVAULT_PORT"))
    create_app().run(port=os.environ.get("SHAREVAULT_PORT"))           