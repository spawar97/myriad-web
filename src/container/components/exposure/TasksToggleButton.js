var React = require('react');


class TasksToggleButton extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            taskTableData: [],
            activeIndex: 0,
            hide: false
        }
    }
    render() {
        return (
            <div className='btn-group' role='group'>
                {this.props.items.map((item) => {
                    return (
                        <button
                            key={item.id}
                            type='button'
                            className={`btn toggle-button-item ${item.active ? 'active' : ''}`}
                            onClick={() => {
                                item.onSelected();
                            }}
                        >
                            {item.title}
                        </button>
                    );
                })}
            </div>
        )
    }
}
export default TasksToggleButton;
